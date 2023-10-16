module.exports = {
    apps: [
        {
            name: "lamdam",
            script: "yarn",
            args: "start -p 8088",
            cwd: "/home/www/hop",
            autorestart: true,
            watch: false,
            max_memory_restart: "2G",
            env: {
                NODE_ENV: "production",
                PORT: 8088,
                MONGODB_URI:
                    "mongodb://web3guy:web3guy321@127.0.0.1:27017/lamdam?retryWrites=true&authSource=admin",
                NUID_API_URL: "https://nu.id/api",
                NUID_CLIENT_ID: "CLKUfw6Uq4QG6EsOp8u4EHAc0V85WfG4",
                NUID_CLIENT_SECRET: "SKiq57tUUdKkQwo8Tbi45Q7YA21beMAANhQHX",
                NEXTAUTH_SECRET: "UhZqsqlFZpLbdK5g3lKGM3DVxK9DZ9phVEFRoaYz/xA=",
                NEXTAUTH_URL: "https://lamdam.neuversity.id",
                NEXTAUTH_REDIRECT_URI:
                    "https://lamdam.neuversity.id/api/auth/callback/nu.id",
                GOOGLE_CLIENT_ID:
                    "80850089515-6svnurl3k7kpvs3ug3guclvg71cs823t.apps.googleusercontent.com",
                GOOGLE_CLIENT_SECRET: "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",
                DUMP_PATH: "output/",
                NEXT_PUBLIC_KIAI_API_URL: "http://192.168.1.7:8000",
            },
        },
    ],
};
