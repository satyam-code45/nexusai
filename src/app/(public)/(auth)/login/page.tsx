"use client"
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react"



function LoginPage() {
  
    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className='w-full max-w-md bg-white rounded-2xl shadow-xl p-8'>
                    <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">
                        Welcome Back
                    </h1>
                    <p className="text-center text-gray-600 mb-8">
                        Sign in to continue to your account
                    </p>

                    <button
                        onClick={() => signIn()}
                        
                        className="flex items-center mb-10 cursor-pointer justify-center w-full gap-3 px-2 py-3 border border-gray-300 rounded-xl shadow-sm hover:shadow-md transition bg-white"
                    >
                        <Image src="/icons/google.png" alt="Google" width={30} height={30} />
                        Continue with Google
                    </button>
                </div>

                

            </div>
        </>
    )
}

export default LoginPage
