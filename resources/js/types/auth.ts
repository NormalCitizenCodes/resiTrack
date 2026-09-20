export type Role =
    | 'super_admin'
    | 'barangay_admin'
    | 'bhw'
    | 'partner_agency'
    | 'resident';

export type User = {
    id: number;
    name: string;
    email: string;
    role: Role;
    first_name: string | null;
    last_name: string | null;
    barangay_id: number | null;
    agency_id: number | null;
    resident_id: number | null;
    registration_id: string | null;
    is_active: boolean;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type AuthBarangay = {
    id: number;
    name: string;
    city_municipality: string;
    province: string;
    region: string;
};

export type AuthAgency = {
    id: number;
    agency_name: string;
    agency_type: string | null;
};

export type Auth = {
    user: User;
    barangay: AuthBarangay | null;
    agency: AuthAgency | null;
};

/* @chisel-passkeys */
export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};
/* @end-chisel-passkeys */

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
