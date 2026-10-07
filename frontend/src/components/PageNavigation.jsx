import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./PageNavigation.css";

export default function PageNavigation() {
  const navigate = useNavigate();
  return <nav className="page-navigation" aria-label="Page navigation"><button type="button" onClick={() => navigate(-1)}><ArrowLeft size={16} />Go Back</button><button type="button" onClick={() => navigate("/")}><Home size={16} />Dashboard</button></nav>;
}
