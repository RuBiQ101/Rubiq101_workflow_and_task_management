import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { PrismaService } from '../prisma.service';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let prismaService: PrismaService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            organizationMember: {
              findFirst: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    prismaService = module.get<PrismaService>(PrismaService);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockContext = (
    user: any,
    params: any = {},
    body: any = {},
    query: any = {},
  ): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user,
          params,
          body,
          query,
        }),
      }),
    } as any;
  };

  describe('canActivate', () => {
    it('should allow access when no roles are required', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);
      const context = createMockContext({ id: 'user1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when required roles array is empty', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue([]);
      const context = createMockContext({ id: 'user1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user is not authenticated', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['owner']);
      const context = createMockContext(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Not authenticated',
      );
    });

    it('should throw ForbiddenException when organizationId is missing', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['owner']);
      const context = createMockContext({ id: 'user1' });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Organization context required',
      );
    });

    it('should extract organizationId from params.organizationId', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['owner']);
      const mockFindFirst = jest
        .spyOn(prismaService.organizationMember, 'findFirst')
        .mockResolvedValue({
          id: 'mem1',
          userId: 'user1',
          organizationId: 'org1',
          roleKey: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const context = createMockContext(
        { id: 'user1' },
        { organizationId: 'org1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org1', userId: 'user1' },
      });
    });

    it('should extract organizationId from params.orgId', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['admin']);
      const mockFindFirst = jest
        .spyOn(prismaService.organizationMember, 'findFirst')
        .mockResolvedValue({
          id: 'mem1',
          userId: 'user1',
          organizationId: 'org1',
          roleKey: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const context = createMockContext({ id: 'user1' }, { orgId: 'org1' });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org1', userId: 'user1' },
      });
    });

    it('should extract organizationId from body.organizationId', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['member']);
      const mockFindFirst = jest
        .spyOn(prismaService.organizationMember, 'findFirst')
        .mockResolvedValue({
          id: 'mem1',
          userId: 'user1',
          organizationId: 'org1',
          roleKey: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const context = createMockContext(
        { id: 'user1' },
        {},
        { organizationId: 'org1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org1', userId: 'user1' },
      });
    });

    it('should extract organizationId from query.organizationId', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['guest']);
      const mockFindFirst = jest
        .spyOn(prismaService.organizationMember, 'findFirst')
        .mockResolvedValue({
          id: 'mem1',
          userId: 'user1',
          organizationId: 'org1',
          roleKey: 'guest',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const context = createMockContext(
        { id: 'user1' },
        {},
        {},
        { organizationId: 'org1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org1', userId: 'user1' },
      });
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['owner']);
      jest
        .spyOn(prismaService.organizationMember, 'findFirst')
        .mockResolvedValue(null);

      const context = createMockContext(
        { id: 'user1' },
        { organizationId: 'org1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Not a member of this organization',
      );
    });

    it('should allow access when user has required role', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['owner', 'admin']);
      jest
        .spyOn(prismaService.organizationMember, 'findFirst')
        .mockResolvedValue({
          id: 'mem1',
          userId: 'user1',
          organizationId: 'org1',
          roleKey: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const context = createMockContext(
        { id: 'user1' },
        { organizationId: 'org1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when user has insufficient role', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['owner']);
      jest
        .spyOn(prismaService.organizationMember, 'findFirst')
        .mockResolvedValue({
          id: 'mem1',
          userId: 'user1',
          organizationId: 'org1',
          roleKey: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const context = createMockContext(
        { id: 'user1' },
        { organizationId: 'org1' },
      );

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Insufficient permissions',
      );
    });

    it('should handle multiple required roles', async () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['owner', 'admin', 'member']);
      jest
        .spyOn(prismaService.organizationMember, 'findFirst')
        .mockResolvedValue({
          id: 'mem1',
          userId: 'user1',
          organizationId: 'org1',
          roleKey: 'member',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);

      const context = createMockContext(
        { id: 'user1' },
        { organizationId: 'org1' },
      );

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
