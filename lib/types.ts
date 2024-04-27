// types.ts

export interface OAuthToken {
    oauthRequestToken: string;
    oauthRequestTokenSecret: string;
    verificationURL: string;
  }
  
  export interface AccessToken {
    oauthAccessToken: string;
    oauthAccessTokenSecret: string;
  }
  
  export interface UserIdentity {
    username: string;
    resource_url: string;
    consumer_name: string;
    // Add more properties as needed
  }
  
  export interface Folder {
    id: number;
    name: string;
    count: number;
    resource_url: string;
  }
  