import AccountForm from "../../components/AccountForm";

export const metadata = {
  title: "Sign In | AquaCheck",
  description: "Sign in to your AquaCheck account to save water quality reports and access analysis history.",
};

export default function LoginPage() {
  return <AccountForm mode="login" />;
}

