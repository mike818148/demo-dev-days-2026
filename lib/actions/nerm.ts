"use server";

import { unstable_cache } from "next/cache";
import axios, { AxiosError } from "axios";

/** Cache key and revalidation for core profile types (5 minutes). */
const CORE_PROFILE_TYPES_CACHE_KEY = ["nerm-core-profile-types"];
const CORE_PROFILE_TYPES_REVALIDATE_SECONDS = 300;

/** Cache key and revalidation for ne_attributes (5 minutes). */
const NE_ATTRIBUTES_CACHE_KEY = ["nerm-ne-attributes"];
const NE_ATTRIBUTES_REVALIDATE_SECONDS = 300;

export interface NermUser {
    id: string;
    uid: string;
    name: string;
    email: string;
    type: string;
    title: string;
    status: string;
    login: string;
    last_login: string;
    cookies_accepted_at: string;
    preferred_language: string;
    locale: string;
    group_strings: string;
    sailpoint_identity_id: string;
}

export interface NermUsersResponse {
    users: NermUser[];
    _metadata: {
        limit: number;
        offset: number;
        total: number;
        next?: string;
        previous?: string;
    } | null;
}

/** Response from GET /api/users/:id (single user). */
interface NermSingleUserResponse {
    user: NermUser;
}

/** Role from GET /api/roles. */
export interface NermRole {
    id: string;
    uid: string;
    name: string;
    groups: string[];
}

interface NermRolesResponse {
    roles: NermRole[];
}

/** User-role pairing from GET /api/user_roles. */
export interface NermUserRole {
    id: string;
    uid: string;
    user_id: string;
    role_id: string;
}

interface NermUserRolesResponse {
    user_roles: NermUserRole[];
}

export interface ProfileType {
    id: string;
    uid: string;
    name: string;
    category: string;
    archived: boolean;
    core: boolean;
}

interface NermProfileTypesResponse {
    profile_types: Array<{
        id: string;
        uid: string;
        name: string;
        category: string;
        archived: boolean;
        [key: string]: unknown;
    }>;
    _metadata: {
        limit: number;
        offset: number;
        total: number;
        next?: string;
        previous?: string;
    } | null;
}

/** Profile from GET /api/profiles?profile_type_id=...; attributes vary by profile type. */
export interface NermProfile {
    id: string;
    uid: string;
    name: string;
    profile_type_id: string;
    status: string;
    id_proofing_status: string;
    created_at: string;
    updated_at: string;
    attributes: Record<string, string>;
}

interface NermProfilesResponse {
    profiles: NermProfile[];
    _metadata: {
        limit?: string;
        offset?: string;
        total?: string;
        next?: string;
        previous?: string;
        after_id?: string;
    } | null;
}

/** Item from GET /api/ne_attributes. */
interface NermNeAttribute {
    uid: string;
    label: string;
    [key: string]: unknown;
}

interface NermNeAttributesResponse {
    ne_attributes?: NermNeAttribute[];
    [key: string]: unknown;
}

/** Response from GET /api/ne_attributes/:uid (single attribute). */
interface NermSingleNeAttributeResponse {
    ne_attribute: NermNeAttribute;
}

function buildNermFullUrl(path: string, params?: Record<string, unknown>): string {
    const base = (process.env.NERM_BASE_API_URL ?? "").replace(/\/$/, "");
    const pathNorm = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${pathNorm}`;
    if (params && Object.keys(params).length > 0) {
        const search = new URLSearchParams(
            Object.fromEntries(
                Object.entries(params).map(([k, v]) => [k, String(v)])
            ) as Record<string, string>
        ).toString();
        return `${url}?${search}`;
    }
    return url;
}

const getNermUsersClient = () => {
    const baseURL = process.env.NERM_BASE_API_URL;
    const token = process.env.NERM_API_KEY;
    if (!baseURL || !token) {
        throw new Error(
            "NERM API is not configured: NERM_BASE_API_URL and NERM_API_KEY must be set"
        );
    }
    return axios.create({
        baseURL,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
};

/**
 * Returns true if a NERM user exists with the given SailPoint identity id (ISC id).
 * Uses query param sailpoint_identity_id and considers a match if users or _metadata indicates results.
 */
export async function isUserNermSponsor(iscId: string): Promise<boolean> {
    const id = iscId?.trim();
    if (!id) {
        return false;
    }

    try {
        const client = getNermUsersClient();
        const params = { sailpoint_identity_id: id };
        console.log("[NERM] API call: GET full URL:", buildNermFullUrl("/api/users", params));
        const { data } = await client.get<NermUsersResponse>("/api/users", {
            params,
            maxBodyLength: Infinity,
        });

        const hasUsers = Array.isArray(data?.users) && data.users.length > 0;
        const hasTotal = (data?._metadata?.total ?? 0) > 0;
        const result = hasUsers || hasTotal;
        console.log("[NERM] GET /api/users response:", { sailpoint_identity_id: id, found: result, usersCount: data?.users?.length ?? 0 });
        return result;
    } catch (err) {
        if (err instanceof AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data ?? err.message;
            const fullUrl = buildNermFullUrl("/api/users", { sailpoint_identity_id: id });
            console.error(
                `[isUserNermSponsor] NERM API error (${status}) URL: ${fullUrl}`,
                typeof message === "object" ? JSON.stringify(message) : message
            );
        } else {
            console.error("[isUserNermSponsor]", err);
        }
        return false;
    }
}

/**
 * Fetches a single user by id: GET /api/users/:id.
 * Returns the user or null if not found or on error.
 */
export async function getUserById(id: string): Promise<NermUser | null> {
    const userId = id?.trim();
    if (!userId) {
        return null;
    }

    try {
        const client = getNermUsersClient();
        const path = `/api/users/${encodeURIComponent(userId)}`;
        console.log("[NERM] API call: GET full URL:", buildNermFullUrl(path));
        const { data } = await client.get<NermSingleUserResponse>(path, {
            maxBodyLength: Infinity,
        });

        const user = data?.user;
        if (!user?.id) {
            console.log("[NERM] GET /api/users/:id response: no user in payload");
            return null;
        }
        console.log("[NERM] GET /api/users/:id response:", { id: user.id, name: user.name });
        return user;
    } catch (err) {
        if (err instanceof AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data ?? err.message;
            const path = `/api/users/${encodeURIComponent(userId)}`;
            console.error(
                `[getUserById] NERM API error (${status}) URL: ${buildNermFullUrl(path)}`,
                typeof message === "object" ? JSON.stringify(message) : message
            );
        } else {
            console.error("[getUserById]", err);
        }
        return null;
    }
}

/**
 * Fetches core profile types from NERM (GET /api/profile_types?core=true).
 * Result is cached for 5 minutes so profiles-by-type flows can reuse without extra calls.
 */
async function fetchCoreProfileTypesUncached(): Promise<ProfileType[]> {
    try {
        const client = getNermUsersClient();
        const params = { core: true };
        console.log("[NERM] API call: GET full URL:", buildNermFullUrl("/api/profile_types", params));
        const { data } = await client.get<NermProfileTypesResponse>(
            "/api/profile_types",
            {
                params,
                maxBodyLength: Infinity,
            }
        );

        if (!Array.isArray(data?.profile_types)) {
            console.log("[NERM] GET /api/profile_types response: no profile_types array");
            return [];
        }

        const result = data.profile_types.map(
            (pt): ProfileType => ({
                id: pt.id,
                uid: pt.uid,
                name: pt.name,
                category: pt.category,
                archived: pt.archived ?? false,
                core: true,
            })
        );
        console.log("[NERM] GET /api/profile_types response:", { count: result.length, uids: result.map((pt) => pt.uid) });
        return result;
    } catch (err) {
        if (err instanceof AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data ?? err.message;
            const fullUrl = buildNermFullUrl("/api/profile_types", { core: true });
            console.error(
                `[getCoreProfileTypes] NERM API error (${status}) URL: ${fullUrl}`,
                typeof message === "object" ? JSON.stringify(message) : message
            );
        } else {
            console.error("[getCoreProfileTypes]", err);
        }
        return [];
    }
}

export const getCoreProfileTypes = unstable_cache(
    fetchCoreProfileTypesUncached,
    CORE_PROFILE_TYPES_CACHE_KEY,
    { revalidate: CORE_PROFILE_TYPES_REVALIDATE_SECONDS, tags: ["nerm-profile-types"] }
);

/** Fetches GET /api/ne_attributes and returns uid -> label. Cached result is a plain object; getAttributes() returns a Map. */
async function fetchAttributesUncached(): Promise<Record<string, string>> {
    try {
        const client = getNermUsersClient();
        const path = "/api/ne_attributes";
        const params = { "query[limit]": 400 };
        console.log("[NERM] API call: GET full URL:", buildNermFullUrl(path, params));
        const { data } = await client.get<NermNeAttributesResponse>(path, {
            params,
            maxBodyLength: Infinity,
        });
        const items = data?.ne_attributes ?? (Array.isArray(data) ? data : []);
        if (!Array.isArray(items)) {
            console.log("[NERM] GET /api/ne_attributes response: no array");
            return {};
        }
        const map: Record<string, string> = {};
        for (const item of items) {
            const uid = item?.uid ?? (item as Record<string, unknown>)?.uid;
            const label = item?.label ?? (item as Record<string, unknown>)?.label;
            if (typeof uid === "string") {
                map[uid] = typeof label === "string" ? label : uid;
            }
        }
        console.log("[NERM] GET /api/ne_attributes response:", { count: Object.keys(map).length });
        return map;
    } catch (err) {
        if (err instanceof AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data ?? err.message;
            const fullUrl = buildNermFullUrl("/api/ne_attributes", { "query[limit]": 400 });
            console.error(
                `[getAttributes] NERM API error (${status}) URL: ${fullUrl}`,
                typeof message === "object" ? JSON.stringify(message) : message
            );
        } else {
            console.error("[getAttributes]", err);
        }
        return {};
    }
}

const getAttributesCached = unstable_cache(
    fetchAttributesUncached,
    NE_ATTRIBUTES_CACHE_KEY,
    { revalidate: NE_ATTRIBUTES_REVALIDATE_SECONDS, tags: ["nerm-attributes"] }
);

/** Fetches a single ne_attribute by uid: GET /api/ne_attributes/:uid. */
async function fetchSingleNeAttribute(uid: string): Promise<{ uid: string; label: string } | null> {
    try {
        const client = getNermUsersClient();
        const path = `/api/ne_attributes/${encodeURIComponent(uid)}`;
        console.log("[NERM] API call: GET full URL:", buildNermFullUrl(path));
        const { data } = await client.get<NermSingleNeAttributeResponse>(path, {
            maxBodyLength: Infinity,
        });
        const item = (data?.ne_attribute ?? data ?? {}) as Record<string, unknown>;
        const resolvedUid = item.uid;
        const label = item.label;
        if (typeof resolvedUid === "string") {
            return {
                uid: resolvedUid,
                label: typeof label === "string" ? label : resolvedUid,
            };
        }
        return null;
    } catch (err) {
        if (err instanceof AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data ?? err.message;
            console.error(
                `[getAttributes] NERM API error fetching single attribute (${status}) uid=${uid}:`,
                typeof message === "object" ? JSON.stringify(message) : message
            );
        } else {
            console.error("[getAttributes] fetch single attribute", uid, err);
        }
        return null;
    }
}

/** Returns attribute uid -> label from GET /api/ne_attributes. Cached for 5 minutes. Returns a plain object so it serializes correctly to the client. */
/** If requiredUids is provided, any uid not present in the cached map is fetched via GET /api/ne_attributes/:uid and merged in. */
export async function getAttributes(
    requiredUids?: string[]
): Promise<Record<string, string>> {
    console.log("[NERM] getAttributesCached: requesting", requiredUids?.length ? { requiredUids } : undefined);
    const record = await getAttributesCached();

    if (!requiredUids?.length) {
        console.log("[NERM] getAttributesCached: result", { count: Object.keys(record).length, map: record });
        return record;
    }

    const uids = requiredUids.filter((uid) => uid != null && uid !== "");
    const result: Record<string, string> = {};

    for (const uid of uids) {
        if (uid in record) {
            result[uid] = record[uid];
        } else {
            const attr = await fetchSingleNeAttribute(uid);
            if (attr) {
                result[attr.uid] = attr.label;
            }
        }
    }

    console.log("[NERM] getAttributesCached: result", { count: Object.keys(result).length, map: result });
    return result;
}

/** Resolves profile_type_id from getCoreProfileTypes by uid, then fetches GET /api/profiles?profile_type_id=<id>. */
async function getProfilesByTypeUid(typeUid: string): Promise<NermProfile[]> {
    try {
        const types = await getCoreProfileTypes();
        const profileType = types.find((pt) => pt.uid === typeUid);
        if (!profileType) {
            console.log("[NERM] getProfilesByTypeUid: no profile type found for uid", typeUid);
            return [];
        }
        const client = getNermUsersClient();
        const params = { profile_type_id: profileType.id };
        console.log("[NERM] API call: GET full URL:", buildNermFullUrl("/api/profiles", params));
        const { data } = await client.get<NermProfilesResponse>("/api/profiles", {
            params,
            maxBodyLength: Infinity,
        });
        if (!Array.isArray(data?.profiles)) {
            console.log("[NERM] GET /api/profiles response: no profiles array");
            return [];
        }
        console.log("[NERM] GET /api/profiles response:", { typeUid, profile_type_id: profileType.id, count: data.profiles.length });
        return data.profiles;
    } catch (err) {
        if (err instanceof AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data ?? err.message;
            const fullUrl = buildNermFullUrl("/api/profiles");
            console.error(
                `[getProfilesByTypeUid] NERM API error (${status}) typeUid=${typeUid} URL: ${fullUrl}`,
                typeof message === "object" ? JSON.stringify(message) : message
            );
        } else {
            console.error("[getProfilesByTypeUid]", err);
        }
        return [];
    }
}

/** Profiles for core profile type uid nerm_core_jobs. */
export async function getJobs(): Promise<NermProfile[]> {
    return getProfilesByTypeUid("nerm_core_jobs");
}

/** Profiles for core profile type uid nerm_core_organizations. */
export async function getOrganizations(): Promise<NermProfile[]> {
    return getProfilesByTypeUid("nerm_core_organizations");
}

/** Profiles for core profile type uid nerm_core_non_employees. */
export async function getNonEmployees(): Promise<NermProfile[]> {
    return getProfilesByTypeUid("nerm_core_non_employees");
}

/** Profiles for core profile type uid nerm_core_assignments. */
export async function getAssignments(): Promise<NermProfile[]> {
    return getProfilesByTypeUid("nerm_core_assignments");
}

/**
 * Fetches roles from NERM: GET /api/roles.
 * Returns the roles array or [] on error.
 */
export async function getRoles(): Promise<NermRole[]> {
    try {
        const client = getNermUsersClient();
        const path = "/api/roles";
        console.log("[NERM] API call: GET full URL:", buildNermFullUrl(path));
        const { data } = await client.get<NermRolesResponse>(path, {
            maxBodyLength: Infinity,
        });

        if (!Array.isArray(data?.roles)) {
            console.log("[NERM] GET /api/roles response: no roles array");
            return [];
        }
        console.log("[NERM] GET /api/roles response:", { count: data.roles.length });
        return data.roles;
    } catch (err) {
        if (err instanceof AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data ?? err.message;
            console.error(
                `[getRoles] NERM API error (${status}) URL: ${buildNermFullUrl("/api/roles")}`,
                typeof message === "object" ? JSON.stringify(message) : message
            );
        } else {
            console.error("[getRoles]", err);
        }
        return [];
    }
}

/**
 * Fetches user-role pairings from NERM: GET /api/user_roles.
 * Optional role_id filter is passed as query parameter.
 * Returns the user_roles array or [] on error.
 */
export async function getUserRolePairings(options?: { role_id?: string }): Promise<NermUserRole[]> {
    try {
        const client = getNermUsersClient();
        const path = "/api/user_roles";
        const params = options?.role_id ? { role_id: options.role_id } : undefined;
        console.log("[NERM] API call: GET full URL:", buildNermFullUrl(path, params as Record<string, unknown>));
        const { data } = await client.get<NermUserRolesResponse>(path, {
            params,
            maxBodyLength: Infinity,
        });

        if (!Array.isArray(data?.user_roles)) {
            console.log("[NERM] GET /api/user_roles response: no user_roles array");
            return [];
        }
        console.log("[NERM] GET /api/user_roles response:", { count: data.user_roles.length });
        return data.user_roles;
    } catch (err) {
        if (err instanceof AxiosError) {
            const status = err.response?.status;
            const message = err.response?.data ?? err.message;
            const params = options?.role_id ? { role_id: options.role_id } : undefined;
            console.error(
                `[getUserRolePairings] NERM API error (${status}) URL: ${buildNermFullUrl("/api/user_roles", params as Record<string, unknown>)}`,
                typeof message === "object" ? JSON.stringify(message) : message
            );
        } else {
            console.error("[getUserRolePairings]", err);
        }
        return [];
    }
}

/** Sponsor option for dropdowns: id (user_id) and display name. */
export interface NermSponsorOption {
    id: string;
    name: string;
}

/**
 * Fetches sponsors: finds the "Sponsor" role (name match case-insensitive), gets user-role
 * pairings for that role_id, then resolves each user_id to the user's name via getUserById.
 * Returns an array of { id, name } for use in Sponsor Select (serializable for client).
 */
export async function getSponsors(): Promise<NermSponsorOption[]> {
    const roles = await getRoles();
    const sponsorRole = roles.find((r) => r.name?.trim().toLowerCase() === "sponsor");
    if (!sponsorRole?.id) {
        console.log("[NERM] getSponsors: no role named 'Sponsor' found");
        return [];
    }

    const pairings = await getUserRolePairings({ role_id: sponsorRole.id });
    if (pairings.length === 0) {
        console.log("[NERM] getSponsors: no user_roles for sponsor role", sponsorRole.id);
        return [];
    }

    const results = await Promise.all(
        pairings.map(async (p) => {
            const userId = p.user_id?.trim();
            if (!userId) return null;
            const user = await getUserById(userId);
            const name = user?.name?.trim() || user?.uid?.trim() || userId;
            return { id: userId, name };
        })
    );
    const list = results.filter((r): r is NermSponsorOption => r != null);
    console.log("[NERM] getSponsors:", { roleId: sponsorRole.id, count: list.length });
    return list;
}

// --- Create profile (POST /api/profile) ---

/** Payload for POST /api/profile. */
export interface NermProfileCreatePayload {
    profile: {
        name: string;
        profile_type_id: string;
        status: string;
        id_proofing_status: string;
        archived: boolean;
        attributes: Record<string, string>;
    };
}

/** Response from POST /api/profile. */
export interface NermProfileCreateResponse {
    profile?: NermProfile;
    [key: string]: unknown;
}

/** POST to /api/profile. Uses NERM_BASE_API_URL (e.g. https://acmeco.nonemployee.com). */
async function postProfile(payload: NermProfileCreatePayload): Promise<NermProfile> {
    const client = getNermUsersClient();
    const url = "/api/profile";
    console.log("[NERM] API call: POST", buildNermFullUrl(url));
    const { data } = await client.post<NermProfileCreateResponse>(url, payload, {
        maxBodyLength: Infinity,
    });
    const profile = data?.profile;
    if (!profile?.id) {
        throw new Error("POST /api/profile did not return a profile");
    }
    console.log("[NERM] POST /api/profile response:", { id: profile.id, name: profile.name });
    return profile;
}

/** Resolve profile_type_id by core profile type uid. */
async function resolveProfileTypeId(typeUid: string): Promise<string> {
    const types = await getCoreProfileTypes();
    const pt = types.find((t) => t.uid === typeUid);
    if (!pt) {
        throw new Error(`Profile type not found for uid: ${typeUid}`);
    }
    return pt.id;
}

/** Parameters to create a non-employee profile. */
export interface CreateNonEmployeeParams {
    firstName: string;
    lastName: string;
    contactEmail: string;
    businessEmail: string;
    contactPhoneNumber: string;
    businessPhoneNumber: string;
}

/** Creates a non-employee profile via POST /api/profile. profile_type_id is resolved from nerm_core_non_employees. */
export async function createNonEmployee(params: CreateNonEmployeeParams): Promise<NermProfile> {
    const profileTypeId = await resolveProfileTypeId("nerm_core_non_employees");
    const name = `${params.firstName.trim()} ${params.lastName.trim()}`.trim() || "Unknown";
    const payload: NermProfileCreatePayload = {
        profile: {
            name,
            profile_type_id: profileTypeId,
            status: "Active",
            id_proofing_status: "pending",
            archived: false,
            attributes: {
                nerm_core_non_employee_first_name: params.firstName.trim(),
                nerm_core_non_employee_last_name: params.lastName.trim(),
                nerm_core_non_employee_contact_email: params.contactEmail.trim(),
                nerm_core_non_employee_business_email: params.businessEmail.trim(),
                nerm_core_non_employee_contact_phone_number: params.contactPhoneNumber.trim(),
                nerm_core_non_employee_business_phone_number: params.businessPhoneNumber.trim(),
                is_collaborator: "No",
            },
        },
    };
    return postProfile(payload);
}

/** Parameters to create an assignment profile. All id fields are UUIDs. */
export interface CreateAssignmentParams {
    firstName: string;
    lastName: string;
    businessEmail: string;
    contactEmail: string;
    businessPhoneNumber: string;
    contactPhoneNumber: string;
    /** Organization UUID. */
    assignmentOrganizationId: string;
    /** Job profile UUID. */
    jobId: string;
    /** Sponsor (user) UUID. */
    sponsorId: string;
    jobTitle: string;
    startDate: string; // e.g. "08/05/2026"
    endDate: string;   // e.g. "03/28/2026"
    additionalAccess?: string;
    nonEmployeeType?: string; // e.g. "Contractor"
}

/** Creates an assignment profile via POST /api/profile. profile_type_id is resolved from nerm_core_assignments. Name format: "Externals: &lt;First Last&gt;". */
export async function createAssignment(params: CreateAssignmentParams): Promise<NermProfile> {
    const profileTypeId = await resolveProfileTypeId("nerm_core_assignments");
    const fullName = `${params.firstName.trim()} ${params.lastName.trim()}`.trim() || "Unknown";
    const name = `Externals: ${fullName}`;
    const payload: NermProfileCreatePayload = {
        profile: {
            name,
            profile_type_id: profileTypeId,
            status: "Active",
            id_proofing_status: "pending",
            archived: false,
            attributes: {
                assignment_organization: params.assignmentOrganizationId.trim(),
                nerm_core_assignment_job: params.jobId.trim(),
                nerm_core_assignment_sponsor: params.sponsorId.trim(),
                job_title: params.jobTitle.trim(),
                nerm_core_assignment_start_date: params.startDate.trim(),
                nerm_core_assignment_end_date: params.endDate.trim(),
                nerm_core_non_employee_business_email: params.businessEmail.trim(),
                nerm_core_non_employee_contact_email: params.contactEmail.trim(),
                nerm_core_non_employee_business_phone_number: params.businessPhoneNumber.trim(),
                nerm_core_non_employee_contact_phone_number: params.contactPhoneNumber.trim(),
                nerm_core_non_employee_first_name: params.firstName.trim(),
                nerm_core_non_employee_last_name: params.lastName.trim(),
                "non-employee_type": params.nonEmployeeType?.trim() ?? "Contractor",
                ...(params.additionalAccess != null && params.additionalAccess.trim() !== ""
                    ? { nerm_core_assignment_additional_access: params.additionalAccess.trim() }
                    : {}),
            },
        },
    };
    return postProfile(payload);
}

/** Parameters to create an organization profile (core profile type nerm_core_organizations). */
export interface CreateOrganizationParams {
    name: string;
    /** "Yes" | "No" (e.g. from checkbox). */
    iso27001Tisax: string;
    /** End date MM/dd/yyyy (optional). */
    nermCoreOrganizationEndDate: string;
    /** "Yes" | "No" (e.g. from checkbox). */
    signedNda: string;
    description: string;
}

/** Creates an organization profile via POST /api/profile. profile_type_id is resolved from nerm_core_organizations. Uses name for both profile.name and attributes.nerm_core_organization_name. */
export async function createOrganization(params: CreateOrganizationParams): Promise<NermProfile> {
    const profileTypeId = await resolveProfileTypeId("nerm_core_organizations");
    const name = params.name.trim() || "Unknown";
    const payload: NermProfileCreatePayload = {
        profile: {
            name,
            profile_type_id: profileTypeId,
            status: "Active",
            id_proofing_status: "pending",
            archived: false,
            attributes: {
                "iso27001-tisax": params.iso27001Tisax.trim() || "No",
                nerm_core_organization_end_date: params.nermCoreOrganizationEndDate.trim(),
                nerm_core_organization_name: name,
                signed_nda: params.signedNda.trim() || "No",
                description: params.description.trim(),
            },
        },
    };
    return postProfile(payload);
}
