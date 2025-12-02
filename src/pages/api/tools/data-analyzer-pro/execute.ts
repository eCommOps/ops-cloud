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

    const { jsonData } = await request.json();

    if (!jsonData) {
      return new Response(JSON.stringify({ error: 'JSON data is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and analyze JSON
    let parsedData;
    try {
      parsedData = JSON.parse(jsonData);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const analysis = analyzeJSON(parsedData);

    // Log execution
    const authService = locals.authService;
    if (authService) {
      await authService.createAuditLog(
        auth.user.id,
        'tool_executed',
        'tool',
        'data-analyzer-pro',
        request
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        result: {
          structure: analysis.structure,
          statistics: analysis.statistics,
          formatted: JSON.stringify(parsedData, null, 2),
        },
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

function analyzeJSON(data: any): { structure: string; statistics: string } {
  const structure = analyzeStructure(data);
  const statistics = analyzeStatistics(data);

  return { structure, statistics };
}

function analyzeStructure(data: any, indent = 0): string {
  const type = Array.isArray(data) ? 'array' : typeof data;
  let result = '';

  if (Array.isArray(data)) {
    result += `<div style="margin-left: ${indent * 20}px">`;
    result += `📋 Array (${data.length} items)<br/>`;
    if (data.length > 0) {
      result += analyzeStructure(data[0], indent + 1);
    }
    result += '</div>';
  } else if (type === 'object' && data !== null) {
    result += `<div style="margin-left: ${indent * 20}px">`;
    result += `📦 Object (${Object.keys(data).length} keys)<br/>`;
    Object.keys(data).slice(0, 10).forEach((key) => {
      const valueType = Array.isArray(data[key]) ? 'array' : typeof data[key];
      result += `<div style="margin-left: ${(indent + 1) * 20}px">`;
      result += `🔹 ${key}: ${valueType}<br/>`;
      result += '</div>';
    });
    if (Object.keys(data).length > 10) {
      result += `<div style="margin-left: ${(indent + 1) * 20}px">... and ${Object.keys(data).length - 10} more</div>`;
    }
    result += '</div>';
  } else {
    result += `<div style="margin-left: ${indent * 20}px">${type}</div>`;
  }

  return result;
}

function analyzeStatistics(data: any): string {
  const stats: string[] = [];

  // Count types
  const typeCounts = countTypes(data);
  stats.push(`<strong>Data Types:</strong><br/>`);
  Object.entries(typeCounts).forEach(([type, count]) => {
    stats.push(`• ${type}: ${count}<br/>`);
  });

  // Array statistics
  const arrays = findArrays(data);
  if (arrays.length > 0) {
    stats.push(`<br/><strong>Arrays Found:</strong> ${arrays.length}<br/>`);
    const avgLength = arrays.reduce((sum, arr) => sum + arr.length, 0) / arrays.length;
    stats.push(`• Average length: ${avgLength.toFixed(1)}<br/>`);
  }

  // Number statistics
  const numbers = findNumbers(data);
  if (numbers.length > 0) {
    const sum = numbers.reduce((a, b) => a + b, 0);
    const avg = sum / numbers.length;
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    stats.push(`<br/><strong>Number Stats:</strong><br/>`);
    stats.push(`• Count: ${numbers.length}<br/>`);
    stats.push(`• Average: ${avg.toFixed(2)}<br/>`);
    stats.push(`• Min: ${min}<br/>`);
    stats.push(`• Max: ${max}<br/>`);
  }

  // Size estimate
  const jsonString = JSON.stringify(data);
  const sizeKB = (jsonString.length / 1024).toFixed(2);
  stats.push(`<br/><strong>Size:</strong> ${sizeKB} KB<br/>`);

  return stats.join('');
}

function countTypes(data: any, counts: Record<string, number> = {}): Record<string, number> {
  const type = Array.isArray(data) ? 'array' : typeof data;

  counts[type] = (counts[type] || 0) + 1;

  if (Array.isArray(data)) {
    data.forEach((item) => countTypes(item, counts));
  } else if (type === 'object' && data !== null) {
    Object.values(data).forEach((value) => countTypes(value, counts));
  }

  return counts;
}

function findArrays(data: any, arrays: any[] = []): any[] {
  if (Array.isArray(data)) {
    arrays.push(data);
    data.forEach((item) => findArrays(item, arrays));
  } else if (typeof data === 'object' && data !== null) {
    Object.values(data).forEach((value) => findArrays(value, arrays));
  }
  return arrays;
}

function findNumbers(data: any, numbers: number[] = []): number[] {
  if (typeof data === 'number') {
    numbers.push(data);
  } else if (Array.isArray(data)) {
    data.forEach((item) => findNumbers(item, numbers));
  } else if (typeof data === 'object' && data !== null) {
    Object.values(data).forEach((value) => findNumbers(value, numbers));
  }
  return numbers;
}
