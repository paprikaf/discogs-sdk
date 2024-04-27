
enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH"
  }
interface UserIdentity {
    id: string;
    username: string;
    uri: string;
}

interface ReqeustTokenResponse {
}
  //Reqeust token Search Params
//   URLSearchParams {
//     'oauth_token' => 'QMMnUurNxNGlyzKOciuLRnjdcGNgMvXswVjMXRGG',
//     'oauth_token_secret' => 'DyLzuObkEgRGVULrNveZtmRDrUTydmWAdwcXysTr',
//     'oauth_callback_confirmed' => 'true'
//   } 

interface OAuthSignature {
    oauth_consumer_key: string;
    oauth_signature_method: string;
    oauth_timestamp: number;
    oauth_nonce: number;
    oauth_version: string;
    oauth_signature: string;
}
interface Config{
    method: HttpMethod;
    url: string;
    headers: {
        Authorization: (consumerKey: string, accessTokenSecret: string) => OAuthSignature; 
    }
    data: string;
}
//Request token config
// config {
//     method: 'post',
//     url: 'https://api.discogs.com/oauth/request_token',
//     headers: {
//       Authorization: 'OAuth oauth_consumer_key="VzgMPIFOlJDZhpWoZMUX",oauth_signature_method="PLAINTEXT", oauth_timestamp="1687639943250", oauth_nonce=1687639943250, oauth_version="1.0", oauth_signature="kEPnGjnAGawTRqgnTLMkdCujUIlAHNFm&"'
//     },
//     data: 'oauth_callback=http%3A%2F%2Flocalhost%3A3000%2Fcallback&oauth_consumer_key=VzgMPIFOlJDZhpWoZMUX&oauth_nonce=1687639943250&oauth_signature_method=PLAINTEXT&oauth_timestamp=1687639943250&oauth_version=1.0'
//   }

  
function generateOAuthSignature(oauthConsumerKey: string, oauthAccessTokenSecret: string): OAuthSignature {
    const timestamp: number = Date.now();
    const nonce: number = timestamp;
  
    const consumerKey: string = encodeURIComponent(oauthConsumerKey);
    const signatureMethod: string = "PLAINTEXT";
    const version: string = "1.0";
    const signature: string = `${oauthAccessTokenSecret}&`;
  
    const signatureObject: OAuthSignature = {
      oauth_consumer_key: consumerKey,
      oauth_signature_method: signatureMethod,
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_version: version,
      oauth_signature: signature
    };
  
    return signatureObject;
  }
