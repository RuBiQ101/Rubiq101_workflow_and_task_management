import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.AWS_S3_BUCKET;
const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

@Controller('attachments')
export class AttachmentsPresignGetController {
  constructor(private prisma: PrismaService) {}

  /**
   * GET /attachments/:attachmentId/presign-get
   * Returns { url, expiresIn }
   */
  @UseGuards(JwtAuthGuard)
  @Get(':attachmentId/presign-get')
  async presignGet(
    @Param('attachmentId') attachmentId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
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
        },
      },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    // Verify user is member of attachment's org
    const organization = attachment.task?.project?.workspace?.organization;
    if (!organization)
      throw new NotFoundException('Organization context missing');

    const isMember = organization.members?.some(
      (m: any) => m.userId === userId,
    );
    if (!isMember) {
      throw new ForbiddenException(
        'Not authorized to download this attachment',
      );
    }

    // derive key from stored URL if needed:
    // e.g. https://<BUCKET>.s3.<REGION>.amazonaws.com/<key>
    let key = null;
    try {
      const url = new URL(attachment.url);
      // url.pathname begins with '/'
      key = url.pathname.slice(1);
    } catch (err) {
      // fallback: if you stored key separately earlier, use attachment.key
      if ((attachment as any).key) key = (attachment as any).key;
    }
    if (!key) throw new NotFoundException('S3 key not found for attachment');

    const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });

    const expiresIn = Number(process.env.S3_PRESIGN_GET_EXPIRES_SEC || 60); // short lived by default
    const signedUrl = await getSignedUrl(s3, getCmd, { expiresIn });

    return { url: signedUrl, expiresIn };
  }
}
