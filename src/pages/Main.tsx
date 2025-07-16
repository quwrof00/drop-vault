import Sidebar from "../components/Sidebar";
import MainArea from "../components/MainArea";
import { useState } from "react";

export function Main() {
    const [section, setSection] = useState<string>("Notes");
    return (
        <div className="flex">
            <Sidebar onSelect={setSection}/>
            <MainArea section={section}/>
        </div>
    )
}
export default Main;