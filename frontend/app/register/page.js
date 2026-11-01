import AccountForm from "../../components/AccountForm";

export const metadata = {
  title: "Create Account | AquaCheck",
  description: "Create an account to securely save and track your water quality laboratory analyses.",
};

export default function RegisterPage() {
  return <AccountForm mode="register" />;
}
