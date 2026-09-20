import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    title = '',
    description = '',
    tab,
    children,
}: {
    title?: string;
    description?: string;
    tab?: 'login' | 'register';
    children: React.ReactNode;
}) {
    return (
        <AuthLayoutTemplate title={title} description={description} tab={tab}>
            {children}
        </AuthLayoutTemplate>
    );
}
