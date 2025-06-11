/**
 * Bull Board Dashboard API Route
 *
 * This route serves the Bull Board dashboard for monitoring BullMQ queues.
 * Access: /api/admin/queue-dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { createMonitoringMiddleware } from "@/lib/queue-monitoring";

// Initialize the server adapter
const middleware = createMonitoringMiddleware();

// Handle all HTTP methods for the dashboard
export async function GET(
    request: NextRequest,
    { params }: { params: { path?: string[] } }
) {
    return handleDashboardRequest(request, params);
}

export async function POST(
    request: NextRequest,
    { params }: { params: { path?: string[] } }
) {
    return handleDashboardRequest(request, params);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { path?: string[] } }
) {
    return handleDashboardRequest(request, params);
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { path?: string[] } }
) {
    return handleDashboardRequest(request, params);
}

async function handleDashboardRequest(
    request: NextRequest,
    params: { path?: string[] }
) {
    try {
        // Create a mock Express-like request/response for Bull Board
        const path = params.path ? `/${params.path.join("/")}` : "/";
        const url = new URL(request.url);

        // Mock Express request object
        const mockReq = {
            method: request.method,
            url: path,
            path: path,
            query: Object.fromEntries(url.searchParams.entries()),
            headers: Object.fromEntries(request.headers.entries()),
            body: request.method !== "GET" ? await request.text() : undefined,
        };

        // Mock Express response object
        const responseHeaders: Record<string, string> = {};

        const mockRes = {
            status: () => {
                return mockRes;
            },
            json: () => {
                responseHeaders["content-type"] = "application/json";
                return mockRes;
            },
            send: () => {
                return mockRes;
            },
            setHeader: (name: string, value: string) => {
                responseHeaders[name.toLowerCase()] = value;
                return mockRes;
            },
            end: () => {
                return mockRes;
            },
        };

        // Apply authentication middleware
        let middlewareError = null;
        await new Promise<void>((resolve) => {
            middleware(mockReq, mockRes, (error?: unknown) => {
                middlewareError = error;
                resolve();
            });
        });

        if (middlewareError) {
            return NextResponse.json(
                { error: "Authentication failed" },
                { status: 401 }
            );
        }

        // Since we can't directly use Express router with Next.js,
        // we'll handle the main dashboard routes manually
        if (path === "/" || path === "") {
            // Return the main dashboard HTML
            const dashboardHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Queue Dashboard</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .header {
                border-bottom: 1px solid #eee;
                padding-bottom: 20px;
                margin-bottom: 20px;
              }
              .dashboard-link {
                display: inline-block;
                background: #007bff;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 4px;
                margin: 10px 10px 10px 0;
              }
              .dashboard-link:hover {
                background: #0056b3;
              }
              .info {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚀 Queue Monitoring Dashboard</h1>
                <p>Monitor and manage your BullMQ queues</p>
              </div>
              
              <div class="info">
                <h3>📊 Available Dashboards</h3>
                <p>Access the Bull Board dashboard to monitor queue performance, view jobs, and manage queue operations.</p>
                
                <a href="/api/admin/queue-dashboard/ui" class="dashboard-link" target="_blank">
                  🎛️ Open Bull Board Dashboard
                </a>
                
                <a href="/queue-test" class="dashboard-link">
                  🧪 Queue Test Interface
                </a>
                
                <a href="/api/admin/queue-health" class="dashboard-link">
                  ❤️ Queue Health Check
                </a>
              </div>
              
              <div class="info">
                <h3>🔧 Features</h3>
                <ul>
                  <li><strong>Real-time Monitoring:</strong> View queue statistics and job status in real-time</li>
                  <li><strong>Job Management:</strong> Retry failed jobs, remove jobs, and view job details</li>
                  <li><strong>Performance Metrics:</strong> Track processing rates, error rates, and queue health</li>
                  <li><strong>Historical Data:</strong> View completed and failed jobs with full details</li>
                </ul>
              </div>
              
              <div class="info">
                <h3>🔒 Security</h3>
                <p>
                  ${
                      process.env.NODE_ENV === "production"
                          ? "This dashboard is protected in production. Ensure you have proper authentication credentials."
                          : "This dashboard is accessible in development mode. In production, authentication will be required."
                  }
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

            return new NextResponse(dashboardHtml, {
                status: 200,
                headers: { "content-type": "text/html" },
            });
        }

        // For other paths, try to handle with Bull Board
        // This is a simplified implementation - in a real scenario,
        // you might want to use a more sophisticated routing approach
        return NextResponse.json(
            {
                message: "Bull Board endpoint",
                path,
                note: "Use the UI link from the main dashboard page to access the full Bull Board interface",
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Dashboard error:", error);
        return NextResponse.json(
            {
                error: "Dashboard error",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
