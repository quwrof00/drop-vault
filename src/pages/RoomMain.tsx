import Sidebar from "../components/Sidebar";
import MainArea from "../components/MainArea";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

export function RoomMain() {
    const [section, setSection] = useState<string>("Notes");
    const [searchParams] = useSearchParams();
    const roomId = searchParams.get("roomId");

    return (
        <div className="flex">
            <Sidebar onSelect={setSection}/>
            <MainArea section={section} roomId={roomId}/>
        </div>
    )
}
export default RoomMain;