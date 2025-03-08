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
  inputText: string = ''; // To bind the input text
  stringArray: string[] = []; // To store the added strings
  isLoading: boolean = false; // Loader state
  feedbackMessage: string = ''; // Feedback message
  feedbackType: 'success' | 'error' | '' = ''; // Feedback type
  duplicacyGroups: any[] = []; // To store API response for groups
  currentPath: string | null = null;
  selectedPaths: string[] = []; // Array to store selected file paths

  constructor(private http: HttpClient) {}

  // Add the input text to the array
  addToArray(): void {
    if (this.inputText.trim()) {
      this.stringArray.push(this.inputText.trim());
      this.inputText = ''; // Clear the input field
      this.showFeedback('Path added successfully!', 'success');
    } else {
      this.showFeedback('Please enter a valid directory path.', 'error');
    }
  }

  // Clear the array
  clearArray(): void {
    this.stringArray = [];
    this.showFeedback('All paths cleared.', 'success');
  }

  // Generate a random color for the badge
  getColorForPath(path: string): string {
    const hash = Array.from(path).reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const hue = hash % 360; // Generate a hue value between 0-360
    return `hsl(${hue}, 70%, 50%)`; // Use HSL for consistent, unique colors
  }

  // Show feedback message
  showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;
    setTimeout(() => {
      this.feedbackMessage = '';
      this.feedbackType = '';
    }, 3000); // Hide message after 3 seconds
  }

  showPath(path: string): void {
    this.currentPath = path;
  }

  hidePath(): void {
    this.currentPath = null;
  }

  // Handle checkbox selection
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
    // Reset all checkboxes
    const checkboxes = document.querySelectorAll('.form-check-input') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => checkbox.checked = false);
  }

  // Submit form (if needed in the future)
  onSubmit(): void {
    if (this.stringArray.length === 0) {
      this.showFeedback('The array is empty. Please add some paths first.', 'error');
      return;
    }

    const payload = { rootDirectories: this.stringArray };
    this.isLoading = true; // Show loader

    this.http.post<ApiResponse>('http://localhost:8080/findDuplicates', payload).subscribe({
      next: (response: ApiResponse) => {
        // Construct the full URL for each thumbnail
        response.duplicacyGroups.forEach(group => {
          group.fileInfos.forEach(file => {
            file.thumbnail = `http://localhost:8081/${file.thumbnail}`;
          });
        });

        // Assign processed response to duplicacyGroups
        this.duplicacyGroups = response.duplicacyGroups;
        this.showFeedback('API call successful. Groups loaded.', 'success');
        this.isLoading = false; // Hide loader
      },
      error: (error) => {
        console.error('Error from API:', error);
        this.showFeedback('API call failed. Check console for details.', 'error');
        this.isLoading = false; // Hide loader
      },
    });
  }

  // Handle delete API call
  deleteSelectedFiles(): void {
    const payload = { paths: this.selectedPaths };

    this.http.post('http://localhost:8080/deleteFiles', payload).subscribe({
      next: response => {
        console.log('Files deleted successfully:', response);
        // Optionally refresh the UI or update the state
        this.selectedPaths = [];
      },
      error: error => {
        console.error('Error deleting files:', error);
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