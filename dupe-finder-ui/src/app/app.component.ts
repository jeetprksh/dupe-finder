import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { WebsocketService } from './websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  inputText: string = '';
  stringArray: string[] = [];
  isLoading: boolean = false;
  feedbackMessage: string = '';
  feedbackType: 'success' | 'error' | '' = '';
  duplicacyGroups: any[] = [];
  selectedPaths: string[] = [];
  private wsSub: Subscription | null = null;
  selectedFile: File | null = null;
  showSelectModal = false;
  modalSelectAll = false;
  modalSelectedDirs = new Set<string>();
  allDirectories: string[] = [];

  constructor(private http: HttpClient, private wsService: WebsocketService) {}

  addToArray(): void {
    if (this.inputText.trim()) {
      this.stringArray.push(this.inputText.trim());
      this.inputText = ''; // Clear the input field
      this.showFeedback('Path added successfully!', 'success');
    } else {
      this.showFeedback('Please enter a valid directory path.', 'error');
    }
  }

  clearArray(): void {
    this.stringArray = [];
    this.showFeedback('All paths cleared.', 'success');
  }

  getColorForPath(path: string): string {
    const hash = Array.from(path).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const hue = hash % 360; // Generate a hue value between 0-360
    return `hsl(${hue}, 70%, 50%)`; // Use HSL for consistent, unique colors
  }

  showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;
    setTimeout(() => {
      this.feedbackMessage = '';
      this.feedbackType = '';
    }, 3000);
  }

  onSelectFile(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const filePath = checkbox.value;

    if (checkbox.checked) {
      this.selectedPaths.push(filePath);
    } else {
      this.selectedPaths = this.selectedPaths.filter(path => path !== filePath);
    }
  }

  clearSelection(): void {
    this.selectedPaths = [];
    const checkboxes = document.querySelectorAll('.form-check-input') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => checkbox.checked = false);
  }

  selectAllExceptOne(): void {
    this.selectedPaths = [];

    this.duplicacyGroups.forEach(group => {
      if (!group.fileInfosGroupByDirectory) return;

      Object.values(group.fileInfosGroupByDirectory).forEach(files => {
        const typedFiles = files as FileInfo[];

        // ✅ Only act if subgroup has more than 1 file
        if (typedFiles.length > 1) {
          typedFiles.slice(0, -1).forEach(file => {
            this.selectedPaths.push(file.fullPath);
          });
        }
      });
    });

    // 🔁 Sync checkbox UI
    const checkboxes = document.querySelectorAll(
      '.form-check-input'
    ) as NodeListOf<HTMLInputElement>;

    checkboxes.forEach(cb => {
      cb.checked = this.selectedPaths.includes(cb.value);
    });
  }

  
  clearCache(): void {
    this.http.delete('http://localhost:8080/clearCache').subscribe({
      next: () => {
        this.showFeedback('Cache cleared successfully.', 'success');
      },
      error: (error) => {
        console.error('Error clearing cache:', error);
        this.showFeedback('Failed to clear cache. Check console for details.', 'error');
      }
    });
  }

  viewFile(file: FileInfo): void {
    const payload = { path: file.fullPath };

    this.http.post<any>('http://localhost:8080/cacheFile', payload).subscribe({
      next: (response) => {
        if (response.status && response.file) {
          const fileUrl = `http://localhost:8085/${encodeURIComponent(response.file)}`;
          window.open(fileUrl, '_blank');
        } else {
          this.showFeedback('Failed to cache file for viewing.', 'error');
        }
      },
      error: (error) => {
        console.error('Error caching file:', error);
        this.showFeedback('Error while caching file.', 'error');
      }
    });
  }

  onSubmit(): void {
    if (this.stringArray.length === 0) {
      this.showFeedback('The array is empty. Please add some paths first.', 'error');
      return;
    }

    const payload = { rootDirectories: this.stringArray };
    this.isLoading = true;

    this.http.post<ApiResponse>('http://localhost:8080/findDuplicates', payload).subscribe({
      next: (response: ApiResponse) => {
        this.renderDuplicacyGroups(response);
      },
      error: (error) => {
        console.error('Error from API:', error);
        this.showFeedback('API call failed. Check console for details.', 'error');
        this.isLoading = false;
      },
    });
  }

  private renderDuplicacyGroups(response: ApiResponse) {
    response.duplicacyGroups.forEach(group => {
      group.fileInfos.forEach(file => {
        if (file.thumbnail) {
          file.thumbnail = `http://localhost:8085/${file.thumbnail}`;
        } else {
          file.thumbnail = 'assets/images/loading.gif';
        }
      });
    });

    this.duplicacyGroups = response.duplicacyGroups;
    this.showFeedback('API call successful. Groups loaded.', 'success');
    this.isLoading = false;
    const dirSet = new Set<string>();

    response.duplicacyGroups.forEach(group => {
      if (group.fileInfosGroupByDirectory) {
        Object.keys(group.fileInfosGroupByDirectory).forEach(dir =>
          dirSet.add(dir)
        );
      }
    });

    this.allDirectories = Array.from(dirSet).sort((a, b) => a.localeCompare(b));
  }
  
  deleteSelectedFiles(): void {
    const payload = { paths: this.selectedPaths };
    const deletedPaths = new Set(this.selectedPaths);

    this.http.post('http://localhost:8080/deleteFiles', payload).subscribe({
      next: () => {
        this.showFeedback('Selected files deleted successfully.', 'success');

        this.duplicacyGroups.forEach(group => {
          // 1️⃣ Update grouped structure (UI source of truth)
          if (group.fileInfosGroupByDirectory) {
            const updatedGroups: DirectoryGroup = {};

            for (const [dir, files] of Object.entries(group.fileInfosGroupByDirectory)) {
              const remainingFiles = (files as FileInfo[]).filter(
                f => !deletedPaths.has(f.fullPath)
              );

              if (remainingFiles.length > 0) {
                updatedGroups[dir] = remainingFiles;
              }
            }

            group.fileInfosGroupByDirectory = updatedGroups;
          }

          // 2️⃣ Keep fileInfos in sync (used elsewhere)
          group.fileInfos = group.fileInfos.filter(
            (file: FileInfo) => !deletedPaths.has(file.fullPath)
          );
        });

        // 3️⃣ Remove groups that now have ≤1 file
        this.duplicacyGroups = this.duplicacyGroups.filter(
          g => g.fileInfos.length > 1
        );

        // 4️⃣ Clear selection + force change detection
        this.selectedPaths = [];
        this.duplicacyGroups = [...this.duplicacyGroups];
      },
      error: error => {
        console.error(error);
        this.showFeedback('Failed to delete selected files.', 'error');
      }
    });
  }


  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  uploadMetadataFile(): void {
    if (!this.selectedFile) return;

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<ApiResponse>('http://localhost:8080/dupeMetadata', formData).subscribe({
      next: (response: ApiResponse) => {
        this.renderDuplicacyGroups(response);
        this.selectedFile = null;
      },
      error: (err) => {
        console.error(err);
        this.showFeedback('Failed to upload file.', 'error');
      }
    });
  }

  shortenPath(fullPath: string): string {
    const parts = fullPath.replace(/\\/g, '/').split('/');
    if (parts.length <= 2) {
      return fullPath;
    }
    return `.../${parts.slice(-2).join('/')}`;
  }

  getSubgroupColor(path: string): string {
    const hash = Array.from(path).reduce(
      (acc, c) => c.charCodeAt(0) + ((acc << 5) - acc),
      0
    );
    const hue = Math.abs(hash) % 360;
    return `hsla(${hue}, 70%, 85%, 0.4)`; // translucent
  }

  asDirectoryGroup(group: unknown): DirectoryGroup {
    return group as DirectoryGroup;
  }

  openSelectModal(): void {
    this.modalSelectAll = false;
    this.modalSelectedDirs.clear();
    this.showSelectModal = true;
  }

  closeSelectModal(): void {
    this.showSelectModal = false;
  }
  
  confirmSelection(): void {
    this.clearSelection();

    if (this.modalSelectAll) {
      // Existing behavior
      this.selectAllExceptOne();
      this.closeSelectModal();
      return;
    }

    // Directory-based selection
    this.duplicacyGroups.forEach(group => {
      if (!group.fileInfosGroupByDirectory) return;

      for (const [dir, files] of Object.entries(group.fileInfosGroupByDirectory)) {
        const typedFiles = files as FileInfo[];
        if (!this.modalSelectedDirs.has(dir)) continue;

        // ✅ Directory mode → select ALL files
        typedFiles.forEach(file => {
          this.selectedPaths.push(file.fullPath);
        });
      }
    });

    // Sync checkboxes
    const checkboxes = document.querySelectorAll('.form-check-input') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(cb => cb.checked = this.selectedPaths.includes(cb.value));

    this.closeSelectModal();
  }
  
  onModalSelectAllChange(): void {
    if (this.modalSelectAll) {
      this.modalSelectedDirs.clear();
    }
  }


  get modalDirectories(): string[] {
    return this.allDirectories;
  }

  onDirectoryToggle(dir: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    if (checked) {
      this.modalSelectedDirs.add(dir);
    } else {
      this.modalSelectedDirs.delete(dir);
    }
  }
  
  toggleDirectorySelection(dir: string): void {
    if (this.modalSelectedDirs.has(dir)) {
      this.modalSelectedDirs.delete(dir);
    } else {
      this.modalSelectedDirs.add(dir);
    }
  }

  ngOnInit(): void {
    this.wsService.connect();

    this.wsSub = this.wsService.thumbnailUpdates$.subscribe((update) => {
      const updatedFile = update.fileInfos[0];

      const group = this.duplicacyGroups.find(g => g.uuid === update.uuid);

      if (!group || !group.fileInfosGroupByDirectory) {
        console.warn('WS update for unknown group', update.uuid);
        return;
      }

      for (const [directoryPath, files] of Object.entries(group.fileInfosGroupByDirectory)) {
        const typedFiles = files as FileInfo[];

        const index = typedFiles.findIndex(
          (f: FileInfo) => f.uuid === updatedFile.uuid
        );

        if (index !== -1) {
          typedFiles[index] = {
            ...typedFiles[index],
            thumbnail: `http://localhost:8085/${updatedFile.thumbnail}`
          };

          this.duplicacyGroups = [...this.duplicacyGroups];
          return;
        }
      }

      console.warn('WS update: file not found in any directory', updatedFile.uuid);
    });



  }

  ngOnDestroy(): void {
    this.wsSub?.unsubscribe();
    this.wsService.disconnect();
  }
  
}

interface FileInfo {
  uuid: string;
  name: string;
  thumbnail: string;
  fullPath: string;
  directoryPath: string;
}

interface DuplicacyGroup {
  uuid: string;
  hash: string;
  fileInfos: FileInfo[];
  fileInfosGroupByDirectory?: Record<string, FileInfo[]>;
}

interface ApiResponse {
  duplicacyGroups: DuplicacyGroup[];
}

type DirectoryGroup = Record<string, FileInfo[]>;