import { Panel } from "~/components/Panel/Panel";
import { PanelLayout } from "~/components/Panel/PanelLayout";
import { TabList } from "~/components/Tab/TabList";
import { Pages } from "~/store/GlobalState";
import { LogViewerTabPageContent } from "./LogViewerTabPageContent";
import { toaster } from "~/components/ui/toast.tsx";
import { FileHandler } from "~/services/FileHandler";
import { addNewTab, generateNewLogViewerTab } from "~/services/TabFactory";

function LogViewer() {
  const fileHandler = new FileHandler();
  async function createLogViewerTab(key: string) {
    try {
      const filePath = await fileHandler.openFileDialog("csv");
      const newTab = generateNewLogViewerTab(filePath);
      addNewTab(key, newTab);
    } catch (e) {
      toaster.create({
        title: "Log viewer tab failed",
        description: e as string,
        type: "error",
      });
    }
  }

  return (
    <div style={{ "overflow-y": "hidden", width: `100%`, height: "100%" }}>
      <PanelLayout id={Pages.LogViewer}>
        <Panel>
          <TabList
            onCreateTab={async (key) => {
              await createLogViewerTab(key);
            }}
          >
            <LogViewerTabPageContent />
          </TabList>
        </Panel>
      </PanelLayout>
    </div>
  );
}

export default LogViewer;
