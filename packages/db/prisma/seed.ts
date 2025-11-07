import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('demo1234', 10)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@local.test' },
    update: {},
    create: {
      email: 'demo@local.test',
      name: 'Demo User',
      passwordHash
    }
  })

  const ws = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      ownerId: user.id,
      members: {
        create: {
          userId: user.id,
          role: 'OWNER'
        }
      }
    }
  })

  const wf = await prisma.workflow.create({
    data: {
      name: 'Onboarding',
      workspaceId: ws.id,
      createdById: user.id
    }
  })

  const job = await prisma.job.create({
    data: {
      title: 'Onboard Abhishek',
      workflowId: wf.id,
      ownerId: user.id
    }
  })

  await prisma.task.createMany({
    data: [
      { jobId: job.id, title: 'Create VPN credentials', order: 0 },
      { jobId: job.id, title: 'Assign laptop', order: 1 },
      { jobId: job.id, title: 'Induction meeting', order: 2 }
    ]
  })

  console.log({
    user: user.email,
    workspace: ws.name,
    workflow: wf.name,
    job: job.title
  })
}

main()
  .finally(() => prisma.$disconnect())
