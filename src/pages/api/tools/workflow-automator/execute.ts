import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = locals.auth;

    if (!auth?.isAuthenticated || !auth.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!auth.hasRole(['admin', 'super_user'])) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { workflowName, trigger, actions } = await request.json();

    if (!workflowName || !trigger || !actions) {
      return new Response(JSON.stringify({ error: 'All fields are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse actions
    const actionList = actions.split('\n').filter((a: string) => a.trim());

    if (actionList.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one action is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Simulate workflow execution
    const result = executeWorkflow(workflowName, trigger, actionList);

    // Log execution
    const authService = locals.authService;
    if (authService) {
      await authService.createAuditLog(
        auth.user.id,
        'tool_executed',
        'tool',
        'workflow-automator',
        request
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Tool execution error:', error);
    return new Response(JSON.stringify({ error: 'Execution failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

function executeWorkflow(name: string, trigger: string, actions: string[]) {
  const triggerIcons: Record<string, string> = {
    email: '📧',
    webhook: '🔗',
    schedule: '⏰',
    file: '📁',
  };

  const actionIcons: Record<string, string> = {
    send: '📤',
    update: '🔄',
    create: '➕',
    delete: '🗑️',
    notify: '🔔',
    process: '⚙️',
  };

  // Build workflow steps
  const steps = [
    {
      name: `Trigger: ${getTriggerName(trigger)}`,
      icon: triggerIcons[trigger] || '🎯',
      status: 'Triggered successfully',
    },
    ...actions.map((action, i) => {
      const firstWord = action.toLowerCase().split(' ')[0];
      const icon = Object.keys(actionIcons).find((key) => firstWord.includes(key))
        ? actionIcons[Object.keys(actionIcons).find((key) => firstWord.includes(key))!]
        : '⚡';

      return {
        name: action,
        icon,
        status: `Completed in ${Math.floor(Math.random() * 500) + 100}ms`,
      };
    }),
  ];

  // Calculate totals
  const totalDuration = steps.reduce((sum, step) => {
    const match = step.status.match(/(\d+)ms/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  return {
    workflowName: name,
    steps,
    summary: {
      totalSteps: steps.length,
      successful: steps.length,
      failed: 0,
      duration: `${totalDuration}ms`,
    },
  };
}

function getTriggerName(trigger: string): string {
  const names: Record<string, string> = {
    email: 'New Email Received',
    webhook: 'Webhook Called',
    schedule: 'Scheduled Time',
    file: 'File Upload',
  };
  return names[trigger] || trigger;
}
