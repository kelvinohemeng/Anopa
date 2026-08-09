import { useLocation } from "wouter";

export default function Nav() {
  const [location, navigate] = useLocation();

  const tabs = [
    { id: "/components/products", label: "Product" },
    { id: "/components/cart", label: "Cart" },
    { id: "/components/global", label: "Global" },
    { id: "/components/catalog", label: "Catalog" },
  ];

  const activeIndex = tabs.findIndex((tab) => location.startsWith(tab.id));

  const indicatorStyles = [
    "left-[1.2%] w-[22%]",
    "left-[26%] w-[22%]",
    "left-[51%] w-[22%]",
    "left-[76%] w-[22%]",
  ];

  return (
    <nav className="relative w-full flex justify-between gap-2 text-sm font-medium mb-4 framer-color-bg-secondary rounded-lg">
      <div className="nav-container w-full h-full flex justify-between gap-0 relative z-10 p-2">
        {tabs.map((tab) => {
          return (
            <div
              key={tab.id}
              className="flex justify-center items-center w-full cursor-pointer z-10"
              onClick={() => navigate(tab.id)}
            >
              <p className="text-center w-full h-full !py-2 text-[12px] transition-all">
                {tab.label}
              </p>
            </div>
          );
        })}

        {/* ✅ Single tab indicator */}
        <div
          className={`absolute shadow-lg framer-color-bg h-[calc(100%-8px)] top-1/2 transform -translate-y-1/2 transition-all duration-300 ease-in-out rounded-md ${
            indicatorStyles[activeIndex] || indicatorStyles[0]
          }`}
        />
      </div>
    </nav>
  );
}
