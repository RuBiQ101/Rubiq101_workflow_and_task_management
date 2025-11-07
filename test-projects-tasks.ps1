# Test Projects and Tasks API
# Make sure the API server is running on port 3001

$baseUrl = "http://localhost:3001"

Write-Host "=== Step 1: Login ===" -ForegroundColor Green
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body (@{
    email = "demo@local.test"
    password = "demo1234"
} | ConvertTo-Json) -ContentType "application/json"

$token = $loginResponse.access_token
Write-Host "Token: $token" -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "`n=== Step 2: Get Organizations ===" -ForegroundColor Green
$orgs = Invoke-RestMethod -Uri "$baseUrl/organization" -Method Get -Headers $headers
Write-Host "Organizations:" ($orgs | ConvertTo-Json -Depth 3)

if ($orgs.Count -gt 0) {
    $org = $orgs[0]
    Write-Host "`nUsing organization: $($org.name)" -ForegroundColor Yellow
    
    if ($org.workspaces -and $org.workspaces.Count -gt 0) {
        $workspace = $org.workspaces[0]
        $workspaceId = $workspace.id
        Write-Host "Using workspace: $($workspace.name) (ID: $workspaceId)" -ForegroundColor Yellow
        
        Write-Host "`n=== Step 3: Create Project ===" -ForegroundColor Green
        $project = Invoke-RestMethod -Uri "$baseUrl/workspaces/$workspaceId/projects" -Method Post -Headers $headers -Body (@{
            name = "Q1 Marketing Campaign"
            description = "Launch new product marketing campaign for Q1"
        } | ConvertTo-Json)
        Write-Host "Created project:" ($project | ConvertTo-Json -Depth 2)
        $projectId = $project.id
        
        Write-Host "`n=== Step 4: List Projects in Workspace ===" -ForegroundColor Green
        $projects = Invoke-RestMethod -Uri "$baseUrl/workspaces/$workspaceId/projects?page=1&limit=10" -Method Get -Headers $headers
        Write-Host "Projects:" ($projects | ConvertTo-Json -Depth 3)
        
        Write-Host "`n=== Step 5: Get Project Details ===" -ForegroundColor Green
        $projectDetails = Invoke-RestMethod -Uri "$baseUrl/workspaces/$workspaceId/projects/$projectId" -Method Get -Headers $headers
        Write-Host "Project details:" ($projectDetails | ConvertTo-Json -Depth 3)
        
        Write-Host "`n=== Step 6: Create Task in Project ===" -ForegroundColor Green
        $task = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks" -Method Post -Headers $headers -Body (@{
            title = "Design landing page mockup"
            description = "Create high-fidelity mockups for the landing page"
            status = "TODO"
            priority = 4
            dueDate = "2025-02-15T00:00:00Z"
        } | ConvertTo-Json)
        Write-Host "Created task:" ($task | ConvertTo-Json -Depth 2)
        $taskId = $task.id
        
        Write-Host "`n=== Step 7: Create Another Task ===" -ForegroundColor Green
        $task2 = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks" -Method Post -Headers $headers -Body (@{
            title = "Write marketing copy"
            description = "Draft compelling marketing copy for email campaign"
            status = "IN_PROGRESS"
            priority = 5
        } | ConvertTo-Json)
        Write-Host "Created task 2:" ($task2 | ConvertTo-Json -Depth 2)
        
        Write-Host "`n=== Step 8: List Tasks in Project ===" -ForegroundColor Green
        $tasks = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks?page=1&limit=10" -Method Get -Headers $headers
        Write-Host "Tasks:" ($tasks | ConvertTo-Json -Depth 3)
        
        Write-Host "`n=== Step 9: Get Task Details ===" -ForegroundColor Green
        $taskDetails = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks/$taskId" -Method Get -Headers $headers
        Write-Host "Task details:" ($taskDetails | ConvertTo-Json -Depth 3)
        
        Write-Host "`n=== Step 10: Add Subtask to Task ===" -ForegroundColor Green
        $subtask1 = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks/$taskId/subtasks" -Method Post -Headers $headers -Body (@{
            title = "Choose color scheme"
        } | ConvertTo-Json)
        Write-Host "Created subtask 1:" ($subtask1 | ConvertTo-Json -Depth 2)
        
        $subtask2 = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks/$taskId/subtasks" -Method Post -Headers $headers -Body (@{
            title = "Create wireframe"
        } | ConvertTo-Json)
        Write-Host "Created subtask 2:" ($subtask2 | ConvertTo-Json -Depth 2)
        
        $subtaskId = $subtask1.id
        
        Write-Host "`n=== Step 11: Toggle Subtask Completion ===" -ForegroundColor Green
        $updatedSubtask = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks/subtasks/$subtaskId" -Method Put -Headers $headers -Body (@{
            isDone = $true
        } | ConvertTo-Json)
        Write-Host "Updated subtask:" ($updatedSubtask | ConvertTo-Json -Depth 2)
        
        Write-Host "`n=== Step 12: Update Task Status ===" -ForegroundColor Green
        $updatedTask = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks/$taskId" -Method Put -Headers $headers -Body (@{
            status = "IN_PROGRESS"
        } | ConvertTo-Json)
        Write-Host "Updated task:" ($updatedTask | ConvertTo-Json -Depth 2)
        
        Write-Host "`n=== Step 13: Filter Tasks by Status ===" -ForegroundColor Green
        $filteredTasks = Invoke-RestMethod -Uri "$baseUrl/projects/$projectId/tasks?status=IN_PROGRESS" -Method Get -Headers $headers
        Write-Host "Tasks with status IN_PROGRESS:" ($filteredTasks | ConvertTo-Json -Depth 3)
        
        Write-Host "`n=== Step 14: Update Project ===" -ForegroundColor Green
        $updatedProject = Invoke-RestMethod -Uri "$baseUrl/workspaces/$workspaceId/projects/$projectId" -Method Put -Headers $headers -Body (@{
            description = "Updated: Launch new product marketing campaign for Q1 2025"
        } | ConvertTo-Json)
        Write-Host "Updated project:" ($updatedProject | ConvertTo-Json -Depth 2)
        
        Write-Host "`n=== All Tests Completed Successfully! ===" -ForegroundColor Green
        
    } else {
        Write-Host "No workspaces found. Please create a workspace first." -ForegroundColor Red
    }
} else {
    Write-Host "No organizations found. Please create an organization first." -ForegroundColor Red
}
