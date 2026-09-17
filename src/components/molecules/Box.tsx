import Title from "../atoms/Title";
import Text from "../atoms/Text";
import { useTranslations } from "next-intl";

interface Props {
  title: string;
  text: string;
}
export default function Box({ title, text }: Props) {
  const t = useTranslations();
  return (
    <div className="ds-bg p-7 ds-shadow-md ds-rounded-md w-75">
      <Title variant="primary" size="md" center={true}>
        {t(title)}
      </Title>
      <Text variant="disabled" size="md" center={true}>
        {t(text)}
      </Text>
    </div>
  );
}
