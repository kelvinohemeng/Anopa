import { BackButton } from "../components/BackButton";

export default function Settings() {
  return (
    <div className="space-y-3">
      <BackButton />
      <hr />
      <h2>Settings</h2>
      <p>This page allows you to manage your plugin settings.</p>
    </div>
  );
}
