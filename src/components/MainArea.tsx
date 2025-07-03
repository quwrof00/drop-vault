import Notes from "./Types/Notes";
import Files from "./Types/Files";
import Images from "./Types/Images";
import Codes from "./Types/Codes";

type MainAreaProps = {
  section: string;
};

const MainArea = ({ section }: MainAreaProps) => {
  return (
    <div className="flex-1 border-l-2 border-black bg-gray-900 min-h-screen rounded-none">
      <div className="bg-gray-900 rounded-lg shadow-sm p-6">
        {section === "Notes" && <Notes />}
        {section === "Images" && <Images />}
        {section === "Files" && <Files />}
        {section === "Code" && <Codes />}
        {!section && (
          <p className="text-gray-500 text-center">
            Select a section from the sidebar to view content.
          </p>
        )}
      </div>
    </div>
  );
};

export default MainArea;