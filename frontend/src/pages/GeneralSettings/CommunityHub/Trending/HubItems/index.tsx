// SPDX-License-Identifier: MIT
// Docs: index.doc.md
import paths from "@/utils/paths";
import HubItemCard from "./HubItemCard";
import * as Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { readableType, typeToPath } from "../../utils";
import useCommunityHubTrending from "@/hooks/useCommunityHubTrending";
import { useTranslation } from "react-i18next";

type ExploreItems = Record<
  string,
  {
    items: any[];
    hasMore: boolean;
  }
>;

export default function HubItems(): JSX.Element {
  const { t } = useTranslation();
  const { exploreItems, isLoading } = useCommunityHubTrending();
  return (
    <div className="w-full flex flex-col gap-y-1 pb-6 pt-6">
      <div className="flex flex-col gap-y-2 mb-4">
        <p className="text-base font-semibold text-theme-text-primary">
          {t("communityHub.hubItems.recentlyAdded")}
        </p>
        <p className="text-xs text-theme-text-secondary">
          {t("communityHub.hubItems.exploreLatest")}
        </p>
      </div>
      <HubCategory loading={isLoading} exploreItems={exploreItems} />
    </div>
  );
}

type HubCategoryProps = {
  loading: boolean;
  exploreItems: ExploreItems;
};

function HubCategory({ loading, exploreItems }: HubCategoryProps): JSX.Element {
  const { t } = useTranslation();
  if (loading) return <HubItemCardSkeleton />;
  return (
    <div className="flex flex-col gap-4">
      {Object.keys(exploreItems).map((type) => {
        const path = typeToPath(type as any);
        if (exploreItems[type].items.length === 0) return null;
        return (
          <div key={type} className="rounded-lg w-full">
            <div className="flex justify-between items-center">
              <h3 className="text-theme-text-primary capitalize font-medium mb-3">
                {readableType(type as any)}
              </h3>
              {exploreItems[type].hasMore && (
                <a
                  href={paths.communityHub.viewMoreOfType(path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-button hover:text-primary-button/80 text-sm"
                >
                  {t("communityHub.hubItems.exploreMore")}
                </a>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
              {exploreItems[type].items.map((item: any) => (
                <HubItemCard key={item.id} type={type} item={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HubItemCardSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg w-full">
        <div className="flex justify-between items-center">
          <Skeleton.default
            height="40px"
            width="300px"
            highlightColor="var(--theme-settings-input-active)"
            baseColor="var(--theme-settings-input-bg)"
            count={1}
          />
        </div>
        <Skeleton.default
          height="200px"
          width="300px"
          highlightColor="var(--theme-settings-input-active)"
          baseColor="var(--theme-settings-input-bg)"
          count={4}
          className="rounded-lg"
          containerClassName="flex flex-wrap gap-2 mt-1"
        />
      </div>
      <div className="rounded-lg w-full">
        <div className="flex justify-between items-center">
          <Skeleton.default
            height="40px"
            width="300px"
            highlightColor="var(--theme-settings-input-active)"
            baseColor="var(--theme-settings-input-bg)"
            count={1}
          />
        </div>
        <Skeleton.default
          height="200px"
          width="300px"
          highlightColor="var(--theme-settings-input-active)"
          baseColor="var(--theme-settings-input-bg)"
          count={4}
          className="rounded-lg"
          containerClassName="flex flex-wrap gap-2 mt-1"
        />
      </div>
    </div>
  );
}
