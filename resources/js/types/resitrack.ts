// Domain types mirroring the resiTrack Eloquent models.

export type VulnerabilitySector = {
    id: number;
    sector_name: string;
    code: string;
    description: string | null;
};

export type Barangay = {
    id: number;
    name: string;
    city_municipality: string;
    province: string;
    region: string;
};

export type Household = {
    id: number;
    barangay_id: number;
    zone_id: number | null;
    household_number: string | null;
    family_name?: string | null;
    address: string | null;
    house_materials: string | null;
    house_ownership: string | null;
    water_source: string | null;
    electricity_source: string | null;
    waste_management: string | null;
    toilet_facility: string | null;
    member_count: number;
    monthly_income: string | null;
    is_4ps_beneficiary: boolean;
    barangay?: Barangay;
    residents?: Resident[];
    residents_count?: number;
    wellbeing_assessments?: HouseholdWellbeingAssessment[];
    created_at?: string;
    updated_at?: string;
};

export type WellbeingLevel = {
    id: number;
    level_code: string;
    label: string;
    description?: string | null;
};

export type HouseholdWellbeingAssessment = {
    id: number;
    household_id: number;
    level_id: number;
    assessment_date: string | null;
    remarks: string | null;
    level?: WellbeingLevel;
    assessor?: { id: number; name: string } | null;
    created_at?: string;
};

export type Resident = {
    id: number;
    resident_id: string | null;
    household_id: number | null;
    barangay_id: number;
    philsys_card_no: string | null;
    last_name: string;
    first_name: string;
    middle_name: string | null;
    suffix: string | null;
    full_name: string;
    age: number | null;
    date_of_birth: string | null;
    place_of_birth: string | null;
    address_region_code?: string | null;
    address_province_code?: string | null;
    address_city_code?: string | null;
    address_barangay_code?: string | null;
    address_street?: string | null;
    address_zip?: string | null;
    birth_region_code?: string | null;
    birth_province_code?: string | null;
    birth_city_code?: string | null;
    previous_address?: string | null;
    previous_region_code?: string | null;
    previous_province_code?: string | null;
    previous_city_code?: string | null;
    previous_barangay_code?: string | null;
    previous_street?: string | null;
    previous_zip?: string | null;
    sex: string | null;
    civil_status: string | null;
    religion: string | null;
    citizenship: string | null;
    contact_number: string | null;
    email: string | null;
    address: string | null;
    occupation: string | null;
    employment_status: string | null;
    education_level: string | null;
    education_status: string | null;
    monthly_income: string | null;
    is_pwd: boolean;
    is_solo_parent: boolean;
    is_osy: boolean;
    is_senior_citizen: boolean;
    is_pregnant: boolean;
    /** First day of the expected delivery month, e.g. "2026-11-01". */
    pregnancy_expected_month?: string | null;
    /** Who reported it: "staff" or "self". */
    pregnancy_source?: string | null;
    is_active: boolean;
    is_duplicate_flagged: boolean;
    transferred_to_barangay: number | null;
    transfer_date: string | null;
    transfer_status: string | null;
    registered_at: string | null;
    profiled_at?: string | null;
    profiled_by?: { id: number; name: string } | null;
    barangay?: Barangay;
    household?: Household;
    sectors?: VulnerabilitySector[];
    created_at?: string;
    updated_at?: string;
};

export type DuplicateAlert = {
    id: number;
    resident_id_1: number;
    resident_id_2: number;
    similarity_score: number;
    match_basis: string;
    status: string;
    detected_at: string | null;
    resolved_at: string | null;
    resident_one?: Resident;
    resident_two?: Resident;
};

export type PartnerAgency = {
    id: number;
    agency_name: string;
    agency_type: string | null;
};

export type Program = {
    id: number;
    agency_id: number | null;
    barangay_id: number | null;
    title: string;
    description: string | null;
    eligibility_criteria: string | null;
    slots_available: number;
    slots_filled: number;
    start_date: string | null;
    end_date: string | null;
    status: string;
    agency?: PartnerAgency;
    barangay?: Barangay | null;
    sectors?: VulnerabilitySector[];
    applications_count?: number;
    pending_applications_count?: number;
    beneficiaries_count?: number;
    created_at?: string;
};

export type ProgramApplication = {
    id: number;
    program_id: number;
    resident_id: number;
    status: string;
    applied_at: string | null;
    resident?: Resident;
    program?: Program;
};

export type Beneficiary = {
    id: number;
    program_id: number;
    resident_id: number;
    status: string;
    date_added: string | null;
    remarks: string | null;
    resident?: Resident;
};

export type Announcement = {
    id: number;
    posted_by: number | null;
    barangay_id: number | null;
    title: string;
    content: string | null;
    posted_at: string | null;
    expires_at: string | null;
    author?: { id: number; name: string } | null;
    sectors?: VulnerabilitySector[];
    barangay?: Barangay | null;
};

export type AppNotification = {
    id: number;
    user_id: number | null;
    resident_id: number | null;
    related_user_id?: number | null;
    title: string;
    message: string | null;
    type: string;
    action_url?: string | null;
    is_read: boolean;
    read_at?: string | null;
    created_at: string | null;
};

export type AuditLogEntry = {
    id: number;
    action: string;
    table_affected: string | null;
    new_value: string | null;
    performed_at: string | null;
    user?: { id: number; name: string; role: string } | null;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
};
