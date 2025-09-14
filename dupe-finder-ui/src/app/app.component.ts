import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { WebsocketService } from './websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
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
  currentPath: string | null = null;
  selectedPaths: string[] = [];
  private wsSub: Subscription | null = null;
  selectedFile: File | null = null;

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

  showPath(path: string): void {
    this.currentPath = path;
  }

  hidePath(): void {
    this.currentPath = null;
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
    this.selectedPaths = []; // Reset first

    this.duplicacyGroups.forEach(group => {
      // Leave the last FileInfo unselected
      group.fileInfos.slice(0, -1).forEach((file: FileInfo) => {
        this.selectedPaths.push(file.actualPath);
      });
    });

    // Update checkboxes in the DOM
    const checkboxes = document.querySelectorAll('.form-check-input') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = this.selectedPaths.includes(checkbox.value);
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
    const payload = { path: file.actualPath };

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
  }

  deleteSelectedFiles(): void {
    const payload = { paths: this.selectedPaths };
    this.http.post('http://localhost:8080/deleteFiles', payload).subscribe({
      next: () => {
        this.showFeedback('Selected files deleted successfully.', 'success');
      // Remove deleted files from fileInfos
      this.duplicacyGroups.forEach(group => {
        group.fileInfos = group.fileInfos.filter((file: FileInfo) => 
          !this.selectedPaths.includes(file.actualPath)
        );
      });

      // Remove groups that now have only 1 fileInfo
      this.duplicacyGroups = this.duplicacyGroups.filter(group => group.fileInfos.length > 1);

      // Clear selection
      this.selectedPaths = [];
      },
      error: error => {
        this.showFeedback('Failed to delete selected files. Check console for details.', 'error');
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

  ngOnInit(): void {
    this.wsService.connect();

    this.wsSub = this.wsService.thumbnailUpdates$.subscribe((update) => {
      console.log('Thumbnail update:', update);

      update.fileInfos.forEach((file: any) => {
        file.thumbnail = `http://localhost:8085/${file.thumbnail}`;
      });

      const groupIndex = this.duplicacyGroups.findIndex(g => g.uuid === update.uuid);

      if (groupIndex !== -1) {
        const dg = this.duplicacyGroups[groupIndex];
        const fiIndex = dg.fileInfos.findIndex((fi: FileInfo) => fi.uuid === update.fileInfos[0].uuid);

        if (fiIndex !== -1) {
          const updatedFileInfos = [...dg.fileInfos];
          updatedFileInfos[fiIndex] = {
            ...updatedFileInfos[fiIndex],
            thumbnail: update.fileInfos[0].thumbnail
          };

          this.duplicacyGroups[groupIndex] = {
            ...dg,
            fileInfos: updatedFileInfos
          };

          this.duplicacyGroups = [...this.duplicacyGroups];
        } else {
          console.warn('Received update for unknown file in existing group:', update.fileInfos[0].uuid);
        }
      } else {
        console.warn('Received update for unknown group:', update.uuid);
      }
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
  actualPath: string;
}

interface DuplicacyGroup {
  uuid: string;
  hash: string;
  fileInfos: FileInfo[];
}

interface ApiResponse {
  duplicacyGroups: DuplicacyGroup[];
}