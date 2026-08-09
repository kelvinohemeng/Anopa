import { BackButton } from "../components/BackButton";

export default function HelpPage() {
  return (
    <div className="w-full h-full !space-y-3">
      <BackButton overrideTo="/" />
      <hr />

      <div className="w-full grid grid-cols-2 gap-4 p-4">
        <a
          href="https://docs.thegeneralyst.com/anopa/getting-started"
          target="_blank"
        >
          <button className="relative col-span-1 !flex flex-col !items-start text-left !space-y-3 !min-h-[120px] !h-full !p-3 framer-color-bg-secondary">
            <div className="w-[32px] aspect-square grid place-items-center rounded-md bg-brand-primary ">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                fill="#ffffff"
                viewBox="0 0 256 256"
              >
                <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z"></path>
              </svg>
            </div>
            <div className=" !space-y-1">
              <h3 className="text-[13px] font-bold">Docs</h3>
              <p>Learn how to use anopa</p>
            </div>
            <div className="absolute top-3 right-3 framer-icon-black">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 256 256"
              >
                <path d="M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z"></path>
              </svg>
            </div>
          </button>
        </a>

        <a href="mailto:kelvinohemeng59@gmail.com" target="_blank">
          <button className="relative col-span-1 !flex flex-col !items-start text-left !space-y-3 !min-h-[120px] !h-full !p-3 framer-color-bg-secondary">
            <div className="w-[32px] aspect-square grid place-items-center rounded-md bg-brand-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                fill="#ffffff"
                viewBox="0 0 256 256"
              >
                <path d="M201.89,54.66A103.43,103.43,0,0,0,128.79,24H128A104,104,0,0,0,24,128v56a24,24,0,0,0,24,24H64a24,24,0,0,0,24-24V144a24,24,0,0,0-24-24H40.36A88.12,88.12,0,0,1,190.54,65.93,87.39,87.39,0,0,1,215.65,120H192a24,24,0,0,0-24,24v40a24,24,0,0,0,24,24h24a24,24,0,0,1-24,24H136a8,8,0,0,0,0,16h56a40,40,0,0,0,40-40V128A103.41,103.41,0,0,0,201.89,54.66ZM64,136a8,8,0,0,1,8,8v40a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V136Zm128,56a8,8,0,0,1-8-8V144a8,8,0,0,1,8-8h24v56Z"></path>
              </svg>
            </div>

            <div className=" !space-y-1">
              <h3 className="text-[13px] font-bold">Support</h3>
              <p>Get help from our support team</p>
            </div>
            <div className="absolute top-3 right-3 framer-icon-black">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 256 256"
              >
                <path d="M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z"></path>
              </svg>
            </div>
          </button>
        </a>

        <button
          disabled
          className="relative col-span-2 !flex flex-col !items-start text-left !space-y-3 !min-h-[120px] !h-full !p-3 framer-color-bg-secondary"
        >
          <div className="w-[32px] aspect-square grid place-items-center rounded-md bg-brand-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              fill="#ffffff"
              viewBox="0 0 256 256"
            >
              <path d="M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z"></path>
            </svg>
          </div>
          <div className=" !space-y-1">
            <h3 className="text-[13px] font-bold">Community</h3>
            <p>Coming Soon</p>
          </div>
          <div className="absolute top-3 right-3 framer-icon-black">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 256 256"
            >
              <path d="M204,64V168a12,12,0,0,1-24,0V93L72.49,200.49a12,12,0,0,1-17-17L163,76H88a12,12,0,0,1,0-24H192A12,12,0,0,1,204,64Z"></path>
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
