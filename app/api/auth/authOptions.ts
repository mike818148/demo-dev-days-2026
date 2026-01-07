import { NextAuthOptions } from "next-auth";
import axios from "axios";
import SailPoint from "./sailpoint";

export const authOptions: NextAuthOptions = {
  providers: [
    SailPoint({
      baseUrl: process.env.ISC_BASE_URL!,
      apiUrl: process.env.ISC_BASE_API_URL!,
      clientId: process.env.ISC_CLIENT_ID!,
      clientSecret: process.env.ISC_CLIENT_SECRET!,
      scope: "sp:scopes:all",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // First login
      if (account && user && profile) {
        token.accessToken = account.access_token;
        token.id = profile.id;
        token.tenant = profile.tenant;
        token.displayName = profile.displayName;
        token.name = profile.uid;
        token.capabilities = profile.capabilities;
        // account.expires_at is in seconds (Unix timestamp), convert to milliseconds
        token.accessTokenExpires = (account.expires_at as number) * 1000;
        token.refreshToken = account.refresh_token;
        return token;
      }

      // Return previous token if the access token has not expired yet
      // accessTokenExpires is stored in milliseconds
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      // Access token has expired, try to update it
      return refreshAccessToken(process.env.ISC_BASE_API_URL!, token);
    },
    async session({ session, user, token }) {
      session.accessToken = token.accessToken as string;
      session.user.id = token.id as string;
      session.user.capabilities = token.capabilities as string[];
      session.user.tenant = token.tenant as string;
      session.user.name = token.name as string;
      session.user.uid = token.name as string;
      session.user.displayName = token.displayName as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

/**
 * Takes a token, and returns a new token with updated
 * `accessToken` and `accessTokenExpires`. If an error occurs,
 * returns the old token and an error property
 */
async function refreshAccessToken(apiUrl: string, token: any) {
  try {
    const response = await axios.post(
      `${apiUrl}/oauth/token`,
      {
        client_id: process.env.ISC_CLIENT_ID!,
        client_secret: process.env.ISC_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, expires_in, token_type, refresh_token } =
      response.data;

    return {
      ...token,
      accessToken: access_token,
      // expires_in is in seconds, convert to milliseconds
      accessTokenExpires: Date.now() + expires_in * 1000,
      refreshToken: refresh_token ?? token.refreshToken, // Fall back to old refresh token
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}
