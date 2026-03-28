import { showToast, Toast } from "@raycast/api";
import { seedLibrary } from "./store";

export default async function SeedLibrary() {
  const count = await seedLibrary();
  if (count === 0) {
    showToast({ style: Toast.Style.Success, title: "Library already seeded" });
  } else {
    showToast({
      style: Toast.Style.Success,
      title: `Added ${count} starter prompts`,
    });
  }
}
