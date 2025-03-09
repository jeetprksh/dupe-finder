import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  inputText: string = '';
  stringArray: string[] = [];
  isLoading: boolean = false;
  feedbackMessage: string = '';
  feedbackType: 'success' | 'error' | '' = '';
  duplicacyGroups: any[] = [];
  currentPath: string | null = null;
  selectedPaths: string[] = [];

  constructor(private http: HttpClient) {}

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

  onSubmit(): void {
    if (this.stringArray.length === 0) {
      this.showFeedback('The array is empty. Please add some paths first.', 'error');
      return;
    }

    const payload = { rootDirectories: this.stringArray };
    this.isLoading = true;

    this.http.post<ApiResponse>('http://localhost:8080/findDuplicates', payload).subscribe({
      next: (response: ApiResponse) => {
        // Construct the full URL for each thumbnail
        response.duplicacyGroups.forEach(group => {
          group.fileInfos.forEach(file => {
            file.thumbnail = `http://localhost:8081/${file.thumbnail}`;
          });
        });

        this.duplicacyGroups = response.duplicacyGroups;
        this.showFeedback('API call successful. Groups loaded.', 'success');
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error from API:', error);
        this.showFeedback('API call failed. Check console for details.', 'error');
        this.isLoading = false;
      },
    });
  }

  deleteSelectedFiles(): void {
    const payload = { paths: this.selectedPaths };
    this.http.post('http://localhost:8080/deleteFiles', payload).subscribe({
      next: () => {
        this.showFeedback('Selected files deleted successfully.', 'success');
        this.duplicacyGroups.forEach(group => {
          group.fileInfos = group.fileInfos.filter((file: FileInfo) => !this.selectedPaths.includes(file.actualPath));
        });
        this.selectedPaths = [];
      },
      error: error => {
        this.showFeedback('Failed to delete selected files. Check console for details.', 'error');
      }
    });
  }
  
}

interface FileInfo {
  name: string;
  thumbnail: string;
  actualPath: string;
}

interface DuplicacyGroup {
  hash: string;
  fileInfos: FileInfo[];
}

interface ApiResponse {
  duplicacyGroups: DuplicacyGroup[];
}