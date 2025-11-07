// attachments.presign.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
  Post,
  Body,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RealtimeService } from '../realtime/realtime.service';

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

@Controller('tasks/:taskId/attachments')
export class AttachmentsPresignController {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeService,
  ) {}

  // returns { uploadUrl, key, expiresIn }
  @UseGuards(JwtAuthGuard)
  @Get('presign')
  async presign(
    @Param('taskId') taskId: string,
    @Query('filename') filename: string,
    @Query('contentType') contentType: string,
    @Req() req: any,
  ) {
    if (!filename) throw new BadRequestException('filename is required');
    if (!contentType) {
      throw new BadRequestException('contentType is required');
    }

    // verify task & membership
    const userId = req.user?.id;
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                organization: { include: { members: true } },
              },
            },
          },
        },
      },
    });
    if (!task) throw new BadRequestException('Task not found');

    const isMember = task.project.workspace.organization.members.some(
      (m) => m.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException('Not authorized to upload to this task');
    }

    // build key and set conditions (folder per workspace/project/task)
    const key = `attachments/${task.project.workspaceId}/${taskId}/${Date.now()}-${filename}`;

    // create signed PUT url (short-lived)
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ACL: 'private',
    });

    // expires in seconds (recommend 60 - 300)
    const expiresIn = Number(process.env.S3_PRESIGN_EXPIRES_SEC || 300);

    const uploadUrl = await getSignedUrl(s3, putCommand, { expiresIn });

    return { uploadUrl, key, expiresIn, bucket: BUCKET, region: REGION };
  }

  // After client uploads, call this endpoint to create DB record
  // Body: { key, filename, mimeType, size }
  @UseGuards(JwtAuthGuard)
  @Post('complete')
  async complete(
    @Param('taskId') taskId: string,
    @Body()
    body: {
      key: string;
      filename?: string;
      mimeType?: string;
      size?: number;
    },
    @Req() req: any,
  ) {
    const { key, filename, mimeType, size } = body || {};
    if (!key) throw new BadRequestException('key is required');

    // verify user permission & task exists
    const userId = req.user?.id;
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                organization: { include: { members: true } },
              },
            },
          },
        },
      },
    });
    if (!task) throw new BadRequestException('Task not found');

    const isMember = task.project.workspace.organization.members.some(
      (m) => m.userId === userId,
    );
    if (!isMember) throw new ForbiddenException('Not authorized');

    // (Optional) verify that the key belongs to this task path to prevent tampering
    const expectedPrefix = `attachments/${task.project.workspaceId}/${taskId}/`;
    if (!key.startsWith(expectedPrefix)) {
      throw new BadRequestException('Invalid key for this task');
    }

    // Optionally check object exists in S3 (additional S3 HEAD request)
    // For performance you may skip and trust presigned PUT + client call; or you can verify with HeadObjectCommand

    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    const attachment = await this.prisma.attachment.create({
      data: {
        uploaderId: userId,
        taskId,
        url,
        filename: filename ?? key.split('/').pop(),
        mimeType: mimeType ?? null,
        size: size ?? null,
      },
    });

    // emit realtime event to notify clients
    this.realtime.emitAttachmentAdded(attachment);

    return attachment;
  }
}
