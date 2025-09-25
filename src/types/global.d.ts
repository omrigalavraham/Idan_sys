declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      auth2: {
        init: (config: { client_id: string }) => Promise<any>;
        getAuthInstance: () => {
          signIn: (options: { scope: string }) => Promise<{
            getAuthResponse: () => { access_token: string };
          }>;
          signOut: () => Promise<void>;
        };
      };
    };
  }
}

export {};