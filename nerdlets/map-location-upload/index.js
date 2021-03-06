import React from 'react';

import { NerdletStateContext, navigation } from 'nr1';

import MapLocationFilesUpload from '../geo-ops-nerdlet/MapLocationFilesUpload';
import { PACKAGE_UUID } from '../shared/constants';

export default class MapLocationUploadNerdlet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      files: []
    };

    this.fileInput = React.createRef();
  }

  fileInputOnChange(event) {
    const fileList = event.target.files;
    this.setState({ files: Array.from(fileList) });
  }

  closeFileUploadNerdlet() {
    navigation.openLauncher(
      {
        id: `${PACKAGE_UUID}.geo-ops`,
        nerdlet: {
          id: `${PACKAGE_UUID}.geo-ops-nerdlet`,
          urlState: {
            hasNewLocations: true
          }
        }
      },
      { replaceHistory: true }
    );
  }

  render() {
    const { files } = this.state;

    return (
      <div className="map-location-upload-container">
        <input
          ref={this.fileInput}
          type="file"
          className="json-file-upload"
          accept=".json"
          id="location-upload"
          onChange={event => {
            this.fileInputOnChange(event);
          }}
          onClick={event => {
            event.target.value = null;
          }}
        />
        <NerdletStateContext.Consumer>
          {nerdletState => {
            const { map: mapGuid, accountId } = nerdletState;

            // TO DO - if we don't have these, because of weird user navigation - show inputs to capture these
            // console.log(mapGuid);
            // console.log(accountId);

            return (
              <>
                {files && (
                  <MapLocationFilesUpload
                    accountId={accountId}
                    mapGuid={mapGuid}
                    files={files}
                    onAddFileMapLocations={this.onAddFileMapLocations}
                    onClose={() => this.closeFileUploadNerdlet()}
                  />
                )}
              </>
            );
          }}
        </NerdletStateContext.Consumer>
      </div>
    );
  }
}
