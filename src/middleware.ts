import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return request.cookies.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    });
                },
                remove(name: string, options: CookieOptions) {
                    request.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    });
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // 1. Protect /admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Always allow /admin/login
        if (request.nextUrl.pathname === '/admin/login') {
            return response;
        }

        if (!user) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }

        // Check for admin role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = profile?.role;
        if (role !== 'admin' && role !== 'professor') {
            return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        if (role === 'professor') {
            const allowedPages = ['/admin/students', '/admin/sessions', '/admin/presence'];
            if (request.nextUrl.pathname === '/admin') return NextResponse.redirect(new URL('/admin/students', request.url));
            if (!allowedPages.some(path => request.nextUrl.pathname.startsWith(path))) {
                return NextResponse.redirect(new URL('/admin/students', request.url));
            }
        }
    }

    // 2. Protect /api/admin routes
    if (request.nextUrl.pathname.startsWith('/api/admin')) {
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = profile?.role;
        if (role !== 'admin' && role !== 'professor') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        if (role === 'professor') {
            const path = request.nextUrl.pathname;
            const method = request.method;
            const allowed =
                (path === '/api/admin/students' && ['GET', 'POST'].includes(method)) ||
                (path.startsWith('/api/admin/students/') && method === 'GET') ||
                (path === '/api/admin/sessions' && method === 'GET') ||
                (path === '/api/admin/sessions/students' && method === 'GET') ||
                (path === '/api/admin/enrollments' && ['POST', 'DELETE'].includes(method)) ||
                (path === '/api/admin/presence' && ['GET', 'POST'].includes(method));
            if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/api/admin/:path*'],
};
