import { PrismaClient, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 10);
  
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: hashedPassword,
      name: 'Demo User',
    },
  });

  console.log('✅ Created demo user:', demoUser.email);

  // Create demo organization
  const demoOrg = await prisma.organization.upsert({
    where: { id: 'demo-org' },
    update: {},
    create: {
      id: 'demo-org',
      name: 'Demo Organization',
      description: 'A sample organization for testing',
      ownerId: demoUser.id,
    },
  });

  console.log('✅ Created demo organization:', demoOrg.name);

  // Add user as member of the organization
  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        organizationId: demoOrg.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      userId: demoUser.id,
      roleKey: 'owner',
    },
  });

  console.log('✅ Added demo user to organization');

  // Create demo workspace
  const demoWorkspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      organizationId: demoOrg.id,
    },
  });

  console.log('✅ Created demo workspace:', demoWorkspace.name);

  // Add user as member of the workspace
  await prisma.membership.create({
    data: {
      workspaceId: demoWorkspace.id,
      userId: demoUser.id,
      role: 'ADMIN',
    },
  });

  console.log('✅ Added demo user to workspace');

  // Create demo project
  const demoProject = await prisma.project.create({
    data: {
      name: 'Demo Project',
      description: 'A sample project to demonstrate the Kanban board',
      workspaceId: demoWorkspace.id,
    },
  });

  console.log('✅ Created demo project:', demoProject.name);

  // Create demo tasks
  const tasks = [
    {
      title: 'Setup development environment',
      description: 'Install Node.js, PostgreSQL, and configure the project',
      columnKey: 'done',
      position: 0,
      priority: 3,
      status: TaskStatus.DONE,
    },
    {
      title: 'Design database schema',
      description: 'Create Prisma schema with all required models',
      columnKey: 'done',
      position: 1,
      priority: 3,
      status: TaskStatus.DONE,
    },
    {
      title: 'Implement authentication',
      description: 'JWT-based auth with login and registration',
      columnKey: 'in_progress',
      position: 0,
      priority: 3,
      status: TaskStatus.IN_PROGRESS,
    },
    {
      title: 'Build Kanban board',
      description: 'Drag-and-drop task management with react-beautiful-dnd',
      columnKey: 'in_progress',
      position: 1,
      priority: 2,
      status: TaskStatus.IN_PROGRESS,
    },
    {
      title: 'Add real-time updates',
      description: 'WebSocket integration for live task movements',
      columnKey: 'todo',
      position: 0,
      priority: 2,
      status: TaskStatus.TODO,
    },
    {
      title: 'Implement file attachments',
      description: 'S3 integration for uploading files to tasks',
      columnKey: 'todo',
      position: 1,
      priority: 1,
      status: TaskStatus.TODO,
    },
    {
      title: 'Add task comments',
      description: 'Enable team collaboration with threaded comments',
      columnKey: 'todo',
      position: 2,
      priority: 1,
      status: TaskStatus.TODO,
    },
  ];

  for (const taskData of tasks) {
    await prisma.projectTask.create({
      data: {
        ...taskData,
        projectId: demoProject.id,
      },
    });
  }

  console.log('✅ Created', tasks.length, 'demo tasks');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📝 Demo Credentials:');
  console.log('   Email: demo@example.com');
  console.log('   Password: demo123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
