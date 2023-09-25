import type { OAuthConfig, OAuthUserConfig } from "next-auth/providers";

export interface NuSidProfile {
  id: string;
  name: string;
  email: string;
  image: string;
}

export interface UserUpdatePayload {
  image: string;
}

export default function NuSidProvider<P extends Record<string, any> = NuSidProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  const nuIdBaseUrl = process.env.NUID_API_URL!.split("/").slice(0, 3).join("/");
  return {
    id: "nu.id",
    name: "NU.ID",
    version: "2.0",
    type: "oauth",
    authorization: {
      url: `${process.env.NUID_API_URL}/oauth/authorize`,
      params: {
        scope: "basic_info,update_basic_info",
        response_type: "code",
      },
    },
    allowDangerousEmailAccountLinking: true,
    token: {
      url: `${process.env.NUID_API_URL}/oauth/token`,
      async request({ client, params, checks, provider }) {
        const response = await client.oauthCallback(
          provider.callbackUrl,
          params,
          checks,
          {
            exchangeBody: {
              client_id: options.clientId,
              client_secret: options.clientSecret,
            },
          }
        );
        return { tokens: response }
      },
    },
    userinfo: {
      url: `${process.env.NUID_API_URL}/v1/user/me`,
      params: { "user.fields": "profile_image_url" },
    },
    profile(data, _tokens) {
      return {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        image: data.user.image,
      };
    },
    checks: ["state"],
    style: {
      logo: `${nuIdBaseUrl}/img/next-auth-provider-logo.svg`,
      logoDark: `${nuIdBaseUrl}/img/next-auth-provider-logo.svg`,
      bg: "red",
      text: "#1da1f2",
      bgDark: "red",
      textDark: "#fff",
    },
    options,
  };
}