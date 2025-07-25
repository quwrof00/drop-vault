import Notes from "./Types/Notes";
import Files from "./Types/Files";
import Images from "./Types/Images";
import Codes from "./Types/Codes";

type MainAreaProps = {
  section: string;
};

const MainArea = ({ section }: MainAreaProps) => {
  return (
    <div className="flex-1 border-l-2 border-black bg-gray-900 min-h-[calc(100vh-4rem)] md:min-h-screen rounded-none overflow-auto">
      <div className="bg-gray-900 rounded-lg shadow-sm p-4 sm:p-6 lg:p-8 mx-auto max-w-7xl">
        {section === "Notes" && <Notes />}
        {section === "Images" && <Images />}
        {section === "Files" && <Files />}
        {section === "Code" && <Codes />}
        {!section && (
          <p className="text-gray-500 text-center text-sm sm:text-base">
            Select a section from the sidebar to view content.
          </p>
        )}
      </div>
    </div>
  );
};

export default MainArea;