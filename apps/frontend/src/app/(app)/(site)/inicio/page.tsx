export const dynamic = 'force-dynamic';
import { Metadata } from 'next';
import { HomeComponent } from '@gitroom/frontend/components/home/home.component';
import { isGeneralServerSide } from '@gitroom/helpers/utils/is.general.server.side';
export const metadata: Metadata = {
  title: `${isGeneralServerSide() ? 'Lanza' : 'Gitroom'} Home`,
  description: '',
};
export default async function Index() {
  return <HomeComponent />;
}
