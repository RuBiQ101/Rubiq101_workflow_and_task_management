import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

@Controller('tasks/:taskId/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async upload(
    @Param('taskId') taskId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const uploaderId = req.user?.id;
    if (!uploaderId) {
      throw new BadRequestException('User not authenticated');
    }

    // Validate task exists and user has access
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId },
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

    if (!task) {
      throw new BadRequestException('Task not found');
    }

    // Check user is member of organization
    const isMember = task.project.workspace.organization.members.some(
      (m) => m.userId === uploaderId,
    );
    if (!isMember) {
      throw new BadRequestException('Not authorized to upload to this task');
    }

    // Upload to S3 if configured
    let url: string;
    if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
      const key = `attachments/${task.project.workspaceId}/${taskId}/${Date.now()}-${file.originalname}`;

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private',
      });

      await s3Client.send(command);

      url = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    } else {
      // Fallback: store locally or return error
      throw new BadRequestException(
        'File storage not configured. Please set AWS S3 credentials.',
      );
    }

    // Create attachment record
    const attachment = await this.prisma.attachment.create({
      data: {
        uploaderId,
        taskId,
        url,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      include: {
        uploader: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Create activity
    await this.prisma.activity.create({
      data: {
        actorId: uploaderId,
        workspaceId: task.project.workspaceId,
        projectId: task.projectId,
        taskId: task.id,
        type: 'attachment.added',
        payload: {
          filename: file.originalname,
          size: file.size,
        },
      },
    });

    // Emit realtime event
    this.realtime.emitAttachmentAdded(attachment);

    return attachment;
  }
}
