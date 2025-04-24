import { Client, Users, Account, Storage } from "node-appwrite";

const createAdminClient = async () => {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "") // Your API Endpoint
    .setProject(process.env.NEXT_PUBLIC_PROJECT_ID || "") // Your project ID
    .setKey(process.env.NEXT_PUBLIC_APPWRITE_AUTH_API || ""); // Your secret API key

  return {
    get account() {
      return new Account(client);
    },
    get appwrite_user() {
      return new Users(client);
    },
    get storage() {
      return new Storage(client);
    },
  };
};

const createSessionClient = async (session: string) => {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "") // Your API Endpoint
    .setProject(process.env.NEXT_PUBLIC_PROJECT_ID || ""); // Your project ID

  if (session) {
    client.setSession(session);
  }

  return {
    get account() {
      return new Account(client);
    },
    get storage() {
      return new Storage(client);
    },
  };
};

export { createAdminClient, createSessionClient };
