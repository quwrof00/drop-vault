import React from "react";
import Notes from "./Types/Notes";
import Files from "./Types/Files";
import Images from "./Types/Images";
import Codes from "./Types/Codes";

type MainAreaProps = {
  section: string;
};

const MainArea = ({ section }: MainAreaProps) => {
  return (
    <div className="flex-1 p-6 bg-gray-100 min-h-screen">
      {/* <h1 className="text-3xl font-bold text-gray-800 mb-6 capitalize">
        {section || "Select a Section"}
      </h1> */}
      <div className="bg-white border hover:border-gray-900 rounded-lg shadow-sm p-6">
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