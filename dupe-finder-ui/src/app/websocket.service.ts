import { Injectable } from '@angular/core';
import { Client, IMessage, Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private stompClient: Client | null = null;
  private thumbnailUpdates = new Subject<any>();

  thumbnailUpdates$ = this.thumbnailUpdates.asObservable();

  connect(): void {
    if (this.stompClient && this.stompClient.connected) {
      return;
    }

    this.stompClient = Stomp.over(() => new SockJS('http://localhost:8080/ws'));
    this.stompClient.reconnectDelay = 5000;
    this.stompClient.debug = () => {};

    this.stompClient.onConnect = () => {
      console.log('Connected to WebSocket');
      this.stompClient?.subscribe('/topic/thumbnails', (message: IMessage) => {
        const data = JSON.parse(message.body);
        this.thumbnailUpdates.next(data);
      });
    };

    this.stompClient.activate();
  }

  disconnect(): void {
    this.stompClient?.deactivate();
  }
}
