import { framer, User } from "framer-plugin";
import { useAuth } from "../components/AuthContext";
import { BackButton } from "../components/BackButton";
import { useEffect, useState } from "react";

export default function MyAccount() {
  const { user, signOut } = useAuth();

  const [framerUser, setFramerUser] = useState<User>();

  // Get framer user safely
  useEffect(() => {
    const getFramerUser = async () => {
      try {
        const user = await framer.getCurrentUser();
        setFramerUser(user);
      } catch (error) {
        console.warn("Could not get framer user:", error);
      }
    };
    getFramerUser();
  }, []);

  return (
    <div className="w-full h-full !space-y-3">
      <BackButton overrideTo="/" />
      <hr />

      <div className="w-full h-full flex flex-col gap-6 items-start justify-start">
        <div className="flex flex-col gap-2 items-start">
          <h1 className="text-[20px] font-bold">Account Settings</h1>
          <p>Manage your account settings here</p>
        </div>
        <div className=" w-full flex flex-col gap-3">
          <div className=" w-full flex gap-4 items-center !p-2 framer-color-bg-secondary rounded-xl">
            <div className="flex gap-2 w-full items-center">
              <div className="w-[40px] h-[40px] aspect-square rounded-md overflow-hidden">
                <div className="w-full h-full grid place-items-center bg-brand-primary">
                  {user?.user_metadata?.picture || framerUser?.avatarUrl ? (
                    <img
                      src={
                        framerUser?.avatarUrl ?? user?.user_metadata?.picture
                      }
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <p className="capitalize font-medium  !text-white">
                      {framerUser?.initials}
                    </p>
                  )}
                </div>
                {user?.user_metadata?.picture && (
                  <img
                    className="w-full h-full object-cover"
                    src={user.user_metadata.picture}
                    alt={user.user_metadata?.full_name || "User"}
                  />
                )}
              </div>
              <div className="flex flex-col">
                <p className="font-bold text-[16px]">
                  {user?.user_metadata?.full_name || framerUser?.name}
                </p>
                <p className=" text-[10px] framer-color-text-tertiary">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              className="!text-[12px] shadow-lg !bg-red-500"
              onClick={() => signOut()}
            >
              <p className="!text-white !text-[10px]">Sign out</p>
            </button>
          </div>
          {/* <button
            onClick={() => navigate("/forgot-password")}
            className=" !w-full !text-[12px] "
          >
            Reset Password
          </button> */}
        </div>
      </div>
    </div>
  );
}
