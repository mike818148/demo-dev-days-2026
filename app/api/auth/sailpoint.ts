import { OAuthConfig, OAuthUserConfig } from "next-auth/providers/oauth";

export interface IdentitySecureCloudProfile extends Record<string, any> {
  tenant: string;
  id: string;
  uid: string;
  email: string;
  phone: string;
  workPhone: string;
  firstname: string;
  lastname: string;
  capabilities: string[];
  displayName: string;
  name: string;
}

export default function SailPoint(
  config: OAuthUserConfig<IdentitySecureCloudProfile> & {
    baseUrl: string;
    apiUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
  }
): OAuthConfig<IdentitySecureCloudProfile> {
  return {
    id: "identitySecureCloud",
    name: "Identity Secure Cloud",
    type: "oauth",
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: {
      url: `${config.baseUrl}/oauth/authorize`,
      params: { scope: config.scope },
    },
    token: `${config.apiUrl}/oauth/token`,
    userinfo: `${config.apiUrl}/oauth/userinfo`,
    profile(profile: IdentitySecureCloudProfile) {
      return {
        tenant: profile.tenant,
        id: profile.id,
        uid: profile.uid,
        email: profile.email,
        phone: profile.phone,
        workPhone: profile.workPhone,
        firstname: profile.firstname,
        lastname: profile.lastname,
        capabilities: profile.capabilities,
        displayName: profile.displayName,
        name: profile.uid,
      };
    },
    options: config,
  };
}
