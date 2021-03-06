import React from 'react';
import PropTypes from 'prop-types';

import {
  Stack,
  StackItem,
  Tabs,
  TabsItem,
  Icon,
  navigation,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableRowCell,
  EntityTitleTableRowCell,
  AccountStorageMutation,
  AccountStorageQuery
} from 'nr1';

import RightToolbar from './Toolbars/RightToolbar';
import LeftToolbar from './Toolbars/LeftToolbar';

import { EmptyState, Timeline } from '@newrelic/nr1-community';
import { get, lowerCase, startCase } from 'lodash';

import ViewMapQuery from './ViewMapQuery';
import GeoMap from '../GeoMap';
import Toolbar from '../../shared/components/Toolbar';
import DetailPanel from '../../shared/components/DetailPanel';
import MapLocationTable from '../../shared/components/MapLocationTable';
import FilteredMapLocations from '../../shared/components/FilteredMapLocations';
import LocationMetadata from './LocationMetadata';
import composeEntitySummary from './EntitySummary';

export default class ViewMap extends React.PureComponent {
  static propTypes = {
    maps: PropTypes.array,
    map: PropTypes.object,
    navigation: PropTypes.object
  };

  constructor(props) {
    super(props);

    this.state = {
      begin_time: Date.now() - 60 * 60 * 1000, // 60 min ago
      end_time: Date.now(),
      pollInterval: null,
      detailPanelMinimized: false,
      detailPanelClosed: true,
      activeMapLocation: null,
      regionFilter: '',
      favoriteFilter: null,
      favoriteLocations: {},
      alertFilter: null
    };
  }

  componentDidMount() {
    this.getFavoriteLocations();
    this.pollDataInterval();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.map !== this.props.map) {
      this.getFavoriteLocations();
    }
  }

  componentWillUnmount = () => {
    const { pollInterval } = this.state;
    clearInterval(pollInterval);
  };

  pollDataInterval = () => {
    const newInterval = setInterval(() => {
      if (!document.hidden) {
        this.setState({
          begin_time: Date.now() - 60 * 60 * 1000,
          end_time: Date.now()
        });
      }
    }, 15000);
    this.setState({ pollInterval: newInterval });
  };

  getFavoriteLocations() {
    const { accountId, guid } = this.props.map;

    AccountStorageQuery.query({
      accountId: parseInt(accountId, 10),
      collection: 'workloadsGeoopsFavorites',
      documentId: guid
    }).then(({ data }) => {
      if (data) {
        this.setState({ favoriteLocations: data });
      }
    });
  }

  handleFavoriteClick = (e, column, row) => {
    const { accountId, guid } = this.props.map;

    AccountStorageQuery.query({
      accountId: parseInt(accountId, 10),
      collection: 'workloadsGeoopsFavorites',
      documentId: guid
    }).then(({ data }) => {
      const document = { ...data };

      if (data) {
        if (document[row.externalId]) {
          delete document[row.externalId];
        } else {
          document[row.externalId] = true;
        }
      }

      this.setState({ favoriteLocations: document });

      AccountStorageMutation.mutate({
        accountId: parseInt(accountId, 10),
        actionType: AccountStorageMutation.ACTION_TYPE.WRITE_DOCUMENT,
        collection: 'workloadsGeoopsFavorites',
        documentId: guid,
        document: document
      });
    });
  };

  openDetailPanel = mapLocation => {
    this.setState({
      detailPanelClosed: false,
      activeMapLocation: mapLocation,
      detailPanelMinimized: false
    });
  };

  handleDetailPanelCloseButton = () => {
    this.setState({ detailPanelClosed: true });
  };

  handleDetailPanelMinimizeButton = () => {
    this.setState(prevState => ({
      detailPanelMinimized: !prevState.detailPanelMinimized
    }));
  };

  handleFilterChange = ({ filter }) => {
    const { name, value } = filter;
    this.setState({ [name]: value });
  };

  renderTags() {
    const { activeMapLocation } = this.state;

    const items = activeMapLocation.tags.map((tag, index) => {
      return (
        <div key={index} className="detail-panel-metadata-item">
          <span className="tag-key">{tag.key}:</span>
          <span className="tag-value">{tag.value}</span>
        </div>
      );
    });

    return items;
  }

  handleTableRowClick = location => {
    this.setState({
      activeMapLocation: location,
      detailPanelClosed: false
    });
  };

  openStackedEntity(guid) {
    navigation.openStackedEntity(guid);
  }

  render() {
    const { maps, map, navigation } = this.props;
    const {
      begin_time,
      end_time,
      activeMapLocation,
      detailPanelClosed,
      detailPanelMinimized,
      regionFilter,
      favoriteFilter,
      favoriteLocations,
      alertFilter
    } = this.state;
    return (
      <>
        {map && (
          <ViewMapQuery map={map} begin_time={begin_time} end_time={end_time}>
            {({ mapLocations, entities }) => {
              const hasMapLocations = mapLocations && mapLocations.length > 0;
              const hasEntities = entities && entities.length > 0;

              if (!hasMapLocations) {
                return (
                  <EmptyState
                    heading="No map locations found"
                    description=""
                    buttonText="Add Locations"
                    buttonOnClick={() => {
                      navigation.router({
                        to: 'createMap',
                        state: { selectedMap: map, activeStep: 2 }
                      });
                    }}
                  />
                );
              }

              return (
                <>
                  <Toolbar
                    className="view-map-toolbar"
                    left={
                      <LeftToolbar
                        navigation={navigation}
                        maps={maps}
                        map={map}
                        mapLocations={mapLocations}
                        onFilter={this.handleFilterChange}
                        regionFilter={regionFilter}
                        favoriteFilter={favoriteFilter}
                        alertFilter={alertFilter}
                      />
                    }
                    right={<RightToolbar navigation={navigation} />}
                  />
                  <Stack
                    fullWidth
                    gapType={Stack.GAP_TYPE.NONE}
                    className="primary-grid view-map-primary-grid"
                  >
                    <StackItem
                      fullHeight
                      className="locations-table-stack-item"
                    >
                      {hasMapLocations && hasEntities && (
                        <MapLocationTable
                          data={mapLocations}
                          favoriteLocations={favoriteLocations}
                          map={map}
                          rowClickHandler={this.handleTableRowClick}
                          favoriteClickHandler={this.handleFavoriteClick}
                          activeMapLocation={activeMapLocation}
                        />
                      )}
                      {hasMapLocations && !hasEntities && (
                        <>
                          <div
                            className="alert-warning"
                            onClick={() =>
                              navigation.router({
                                to: 'createMap',
                                state: { selectedMap: map, activeStep: 1 }
                              })
                            }
                          >
                            <Icon
                              type={
                                Icon.TYPE
                                  .INTERFACE__SIGN__EXCLAMATION__V_ALTERNATE
                              }
                              color="#8c732a"
                            />
                            <p>
                              Your map locations have not yet been associated
                              with entities. <a href="#">Resolve this</a>
                            </p>
                          </div>
                          <MapLocationTable
                            data={mapLocations}
                            map={map}
                            rowClickHandler={this.handleTableRowClick}
                            activeMapLocation={activeMapLocation}
                          />
                        </>
                      )}
                      {!hasMapLocations && this.renderEmptyState()}
                    </StackItem>
                    <StackItem grow className="primary-content-container">
                      {hasMapLocations && (
                        <FilteredMapLocations
                          mapLocations={mapLocations}
                          filters={[]}
                          regionFilter={regionFilter}
                          favoriteFilter={favoriteFilter}
                          favoriteLocations={favoriteLocations}
                          alertFilter={alertFilter}
                        >
                          {({ filteredMapLocations }) => (
                            <GeoMap
                              map={map}
                              mapLocations={filteredMapLocations}
                              onMarkerClick={this.openDetailPanel}
                              activeMapLocation={activeMapLocation}
                            />
                          )}
                        </FilteredMapLocations>
                      )}
                      {!hasMapLocations && (
                        <EmptyState
                          heading="No map locations found"
                          description=""
                        />
                      )}
                    </StackItem>
                    <StackItem
                      fullHeight
                      className={`detail-panel-stack-item ${
                        detailPanelClosed ? 'closed' : ''
                      } ${detailPanelMinimized ? 'minimized' : ''}`}
                    >
                      <DetailPanel
                        map={map}
                        onClose={this.handleDetailPanelCloseButton}
                        onMinimize={this.handleDetailPanelMinimizeButton}
                        data={activeMapLocation}
                        relatedEntities={get(activeMapLocation, 'entities', [])}
                      >
                        <Tabs>
                          <TabsItem
                            value="tab-1"
                            label="Recent incidents"
                            className="no-padding"
                          >
                            {activeMapLocation ? (
                              <Timeline activeMapLocation={activeMapLocation} />
                            ) : (
                              <></>
                            )}
                          </TabsItem>
                          <TabsItem
                            value="tab-2"
                            label="Metadata"
                            className="no-padding"
                          >
                            {activeMapLocation ? (
                              <LocationMetadata
                                activeMapLocation={activeMapLocation}
                              />
                            ) : (
                              <></>
                            )}
                          </TabsItem>
                          <TabsItem
                            value="tab-3"
                            label={`Entity summary (${
                              get(activeMapLocation, 'entities', []).length
                            })`}
                            className="entity-summary-tab"
                          >
                            <Table
                              spacingType={[
                                Table.SPACING_TYPE.NONE,
                                Table.SPACING_TYPE.NONE
                              ]}
                              items={composeEntitySummary(
                                activeMapLocation
                                  ? activeMapLocation.entities
                                  : []
                              )}
                            >
                              <TableHeader>
                                <TableHeaderCell width="65%">
                                  Name
                                </TableHeaderCell>
                                <TableHeaderCell>Type</TableHeaderCell>
                              </TableHeader>

                              {({ item }) => (
                                <TableRow
                                  onClick={() =>
                                    this.openStackedEntity(item.guid)
                                  }
                                >
                                  <EntityTitleTableRowCell value={item} />
                                  <TableRowCell>
                                    {startCase(lowerCase(item.type))}
                                  </TableRowCell>
                                </TableRow>
                              )}
                            </Table>
                          </TabsItem>
                        </Tabs>
                      </DetailPanel>
                    </StackItem>
                  </Stack>
                </>
              );
            }}
          </ViewMapQuery>
        )}
      </>
    );
  }
}
