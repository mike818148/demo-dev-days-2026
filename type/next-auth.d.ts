import NextAuth from "next-auth/next";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      tenant: string;
      uid: string;
      capabilities: string[];
      displayName: string;
    };
    accessToken: string;
  }

  interface Profile {
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
  }

  interface User {
    id: string;
  }
}
