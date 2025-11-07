import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
  namespace: '/realtime',
})
@Injectable()
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly realtimeService: RealtimeService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.realtimeService.init(server);
    this.logger.log('Realtime WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from auth or headers
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Connection refused (no token) - client ${client.id}`);
        client.disconnect(true);
        return;
      }

      // Verify JWT
      const payload: any = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      const userId = payload?.sub ?? payload?.id;

      if (!userId) {
        this.logger.warn(
          `Connection refused (invalid token payload) - client ${client.id}`,
        );
        client.disconnect(true);
        return;
      }

      // Attach user info to socket
      (client as any).user = { id: userId };

      // Auto-join user-specific room
      await client.join(`user:${userId}`);

      this.logger.log(`Client connected: ${client.id} as user:${userId}`);
    } catch (err: any) {
      this.logger.warn(`Connection rejected: ${err?.message || err}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).user?.id;
    this.logger.log(
      `Client disconnected: ${client.id}${userId ? ` (user: ${userId})` : ''}`,
    );
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody()
    payload: { workspaceId?: string; projectId?: string; taskId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const user = (client as any).user;
    if (!user?.id) {
      client.emit('error', { message: 'Not authenticated' });
      return { ok: false };
    }

    try {
      // Check workspace access
      if (payload.workspaceId) {
        const workspace = await this.prisma.workspace.findUnique({
          where: { id: payload.workspaceId },
          include: { organization: { include: { members: true } } },
        });
        if (!workspace) throw new ForbiddenException('Workspace not found');
        const isMember = workspace.organization.members.some(
          (m) => m.userId === user.id,
        );
        if (!isMember) {
          client.emit('error', { message: 'Not authorized for workspace' });
          return { ok: false };
        }
        await client.join(`workspace:${payload.workspaceId}`);
        this.logger.debug(
          `User ${user.id} subscribed to workspace:${payload.workspaceId}`,
        );
      }

      // Check project access
      if (payload.projectId) {
        const project = await this.prisma.project.findUnique({
          where: { id: payload.projectId },
          include: {
            workspace: {
              include: { organization: { include: { members: true } } },
            },
          },
        });
        if (!project) throw new ForbiddenException('Project not found');
        const isMember = project.workspace.organization.members.some(
          (m) => m.userId === user.id,
        );
        if (!isMember) {
          client.emit('error', { message: 'Not authorized for project' });
          return { ok: false };
        }
        await client.join(`project:${payload.projectId}`);
        this.logger.debug(
          `User ${user.id} subscribed to project:${payload.projectId}`,
        );
      }

      // Check task access
      if (payload.taskId) {
        const task = await this.prisma.projectTask.findUnique({
          where: { id: payload.taskId },
          include: {
            project: {
              include: {
                workspace: {
                  include: { organization: { include: { members: true } } },
                },
              },
            },
          },
        });
        if (!task) throw new ForbiddenException('Task not found');
        const isMember = task.project.workspace.organization.members.some(
          (m) => m.userId === user.id,
        );
        if (!isMember) {
          client.emit('error', { message: 'Not authorized for task' });
          return { ok: false };
        }
        await client.join(`task:${payload.taskId}`);
        this.logger.debug(`User ${user.id} subscribed to task:${payload.taskId}`);
      }

      return { ok: true };
    } catch (err: any) {
      this.logger.error(`Subscribe error: ${err?.message || err}`);
      client.emit('error', { message: 'Subscription failed' });
      return { ok: false };
    }
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @MessageBody()
    payload: { workspaceId?: string; projectId?: string; taskId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (payload.workspaceId) {
      await client.leave(`workspace:${payload.workspaceId}`);
    }
    if (payload.projectId) {
      await client.leave(`project:${payload.projectId}`);
    }
    if (payload.taskId) {
      await client.leave(`task:${payload.taskId}`);
    }

    return { ok: true };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { time: Date.now() });
    return { ok: true };
  }
}
