import { useLocation } from "wouter";

export default function GetStarted() {
  const [, navigate] = useLocation();

  return (
    <div className="flex h-[460px] flex-col  gap-4">
      <div className="relative h-full w-full bg-brand-primary overflow-clip rounded-xl flex flex-col gap-1 items-center justify-center !p-14">
        {/* <div className="ap-logo max-w-[120px]"></div> */}
        <h1 className="text-center text-xl font-bold tracking-tighter framer-color-text-reversed">
          Shopify integration made for Framer designers.
        </h1>
        <img src="/get-started-image.png" className="absolute inset-0" alt="" />
      </div>
      <div className=" flex flex-col items-center justify-center gap-3 w-full">
        <button
          className="framer-button-primary !w-full"
          onClick={() => navigate("/signup")}
        >
          Get Started for Free
        </button>

        <button
          className="framer-button-secondary !w-full"
          onClick={() => navigate("/login")}
        >
          Log in
        </button>
      </div>
    </div>
  );
}
