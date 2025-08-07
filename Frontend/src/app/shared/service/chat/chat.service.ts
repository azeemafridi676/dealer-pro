import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
// import { SocketService } from '../socket/socket.service';
import { LoggingService } from '../logging.service';

interface ChatMessage {
  _id: string;
  message: string;
  createdAt: Date;
  isAdmin: boolean;
  sender: string;
  status: 'sent' | 'delivered' | 'read';
  threadId: string;
  attachments?: Array<{
    url: string;
    name: string;
    type: string;
  }>;
}

interface ChatThread {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  lastMessage?: string;
  unreadCount: number;
  status: 'active' | 'resolved' | 'closed';
  lastActivity: Date;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private readonly SOURCE = 'chat.service.ts';
  private readonly API_URL = `${environment.BACKEND_URL}/chat`;
  private readonly GET_ALL_MESSAGES = `${environment.BACKEND_URL}/api/chat/get-messages`;
  private readonly GET_ALL_MESSAGES_ADMIN = `${environment.BACKEND_URL}/api/chat/get-admin-messages`;
  private readonly SEND_MESSAGE_TO_ADMIN = `${environment.BACKEND_URL}/api/chat/send-message-to-admin`;
  private readonly GET_ADMIN_THREADS = `${environment.BACKEND_URL}/api/chat/admin/threads`;
  private readonly SEND_MESSAGE_TO_USER = `${environment.BACKEND_URL}/api/chat/send-message-to-user`;
  private readonly MARK_MESSAGES_AS_READ = `${environment.BACKEND_URL}/api/chat/mark-messages-read`;
  private readonly CREATE_OR_GET_THREAD = `${environment.BACKEND_URL}/api/chat/admin/create-thread`;
  private readonly GET_THREAD_BY_ID = `${environment.BACKEND_URL}/api/chat/admin/thread`;
  private messages = new BehaviorSubject<ChatMessage[]>([]);
  public activeThread = new BehaviorSubject<ChatThread | null>(null);
  private typing = new BehaviorSubject<boolean>(false);
  constructor(
    private http: HttpClient,
    // private socketService: SocketService,
    private loggingService: LoggingService
  ) {
    // this.initializeSocketListeners();
  }

  private initializeSocketListeners() {
  
    // this.socketService.getThreadStatusUpdates().subscribe(update => {
    //   if (update) {
    //     this.updateThreadStatus(update);
    //   }
    // });
  }

  getMessages(): Observable<ChatMessage[]> {
    return this.messages.asObservable();
  }

  getTypingStatus(): Observable<boolean> {
    return this.typing.asObservable();
  }

  setActiveThread(threadId: any) {
    if (this.activeThread.value?._id !== threadId) {
      // this.socketService.connectToThread(this.getActiveThreadId() || '');
      this.activeThread.next(threadId);
    }
  }
  getActiveThreadId(){
    return this.activeThread.value?._id;
  }

  sendMessage(message: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.SEND_MESSAGE_TO_ADMIN}`, { message })
      .pipe(
        tap(response => {
        })
      );
  }

  sendAdminMessage(threadId: string, message: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.SEND_MESSAGE_TO_USER}`, { message, threadId })
      .pipe(
        tap(response => {
        })
      );
  }

  getAdminThreads(page: number, limit: number, search: string): Observable<any> {
    return this.http.get(`${this.GET_ADMIN_THREADS}`, {
      params: { page: page.toString(), limit: limit.toString(), search }
    });
  }
  getThreadMessages(): Observable<any> {
    return this.http.get(this.GET_ALL_MESSAGES); 
  }
  getThreadMessagesAdmin(threadId: string, page: number, limit: number): Observable<any> {
    console.log('getThreadMessagesAdmin',threadId, page, limit);
    return this.http.get(`${this.GET_ALL_MESSAGES_ADMIN}`, {
      params: { threadId, page: page.toString(), limit: limit.toString() }
    });
  }
  

  private updateThreadStatus(data: { threadId: string; status: 'active' | 'resolved' | 'closed' }) {
    const currentThread = this.activeThread.value;
    if (currentThread && currentThread._id === data.threadId) {
      this.activeThread.next({ ...currentThread, status: data.status });
    }
  }

  clearChat() {
    this.messages.next([]);
    this.activeThread.next(null);
  }

  markMessagesAsRead(threadId: string): Observable<any> {
    return this.http.post(`${this.MARK_MESSAGES_AS_READ}`, { threadId })
      .pipe(
        tap(() => {
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  createOrGetChatThread(userId: string): Observable<any> {
    return this.http.post(`${this.CREATE_OR_GET_THREAD}`, { userId })
      .pipe(
        tap(response => {
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }

  getThreadById(threadId: string): Observable<ChatThread> {
    return this.http.get<ChatThread>(`${this.GET_THREAD_BY_ID}/${threadId}`)
      .pipe(
        tap(thread => {
        }),
        catchError(error => {
          return throwError(() => error);
        })
      );
  }
} 