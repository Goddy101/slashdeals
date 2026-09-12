import SubmitDealForm from '@/components/deals/SubmitDealForm';

export const metadata = {
  title: 'Submit a Deal | SlashDeals',
  description: 'Found an amazing discount? Share it with the community.',
};

export default function SubmitPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900">Post a Deal</h1>
        <p className="text-gray-500 mt-2">
          Found crazy awoof? Share it below. If you're a merchant looking for guaranteed top-spot visibility, you can bid for premium slots in your dashboard.
        </p>
      </div>
      
      <SubmitDealForm />
    </main>
  );
}