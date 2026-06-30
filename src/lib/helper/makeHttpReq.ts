
type HttpVerb="GET"|"PUT"|"POST"|"DELETE"


export function makeHttpReq<T>(verb:HttpVerb,endpoint:string,input?:T){

    return new Promise(async(resolve,reject)=>{

        try {
            const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/${endpoint}`;
            console.log(`[http] ${verb} /api/${endpoint}`, input ? JSON.stringify(input).slice(0, 120) : '');
            const res=await fetch(url,{
                headers:{
                    accept:"application/json",
                    "Content-Type":"application/json"
                },
                body:JSON.stringify(input),
                method:verb
            })

            if (!res.ok) {
                let message = res.statusText || "Request failed";
                try {
                    const body = await res.json();
                    if (body?.error) message = body.error;
                    else if (body?.message) message = body.message;
                } catch {}
                console.error(`[http] ${verb} /api/${endpoint} → ${res.status} ${message}`);
                throw new Error(message);
            }

            const data=await res.json()
            console.log(`[http] ${verb} /api/${endpoint} → ${res.status} OK`);
            resolve(data)

        } catch (error) {
            reject(error)
        }

    })
}