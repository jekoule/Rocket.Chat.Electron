import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { takeEvery } from 'redux-saga/effects';

import {
	SCREEN_SHARING_DIALOG_SOURCE_SELECTED,
	TOUCH_BAR_FORMAT_BUTTON_TOUCHED,
	WEBVIEW_FAVICON_CHANGED,
	WEBVIEW_FOCUS_REQUESTED,
	WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED,
	WEBVIEW_SIDEBAR_STYLE_CHANGED,
	WEBVIEW_TITLE_CHANGED,
	WEBVIEW_UNREAD_CHANGED,
} from '../../actions';
import { useSaga } from '../SagaMiddlewareProvider';
import {
	useMisspellingDectection,
} from '../SpellCheckingProvider';

export const useWebviewPreload = (webviewRef, webContents, { url, hasSidebar, active, failed }) => {
	const dispatch = useDispatch();
	const getMisspelledWords = useMisspellingDectection();

	useEffect(() => {
		if (!webContents) {
			return;
		}

		const handleIpcMessage = (event) => {
			const { channel, args } = event;

			switch (channel) {
				case 'get-sourceId':
					dispatch({ type: WEBVIEW_SCREEN_SHARING_SOURCE_REQUESTED, payload: { webContentsId: webContents.id, url } });
					break;

				case 'unread-changed':
					dispatch({ type: WEBVIEW_UNREAD_CHANGED, payload: { webContentsId: webContents.id, url, badge: args[0] } });
					break;

				case 'title-changed':
					dispatch({ type: WEBVIEW_TITLE_CHANGED, payload: { webContentsId: webContents.id, url, title: args[0] } });
					break;

				case 'focus':
					dispatch({ type: WEBVIEW_FOCUS_REQUESTED, payload: { webContentsId: webContents.id, url } });
					break;

				case 'sidebar-style':
					dispatch({ type: WEBVIEW_SIDEBAR_STYLE_CHANGED, payload: { webContentsId: webContents.id, url, style: args[0] } });
					break;

				case 'get-misspelled-words':
					webContents.send('misspelled-words', JSON.stringify(args[0]), getMisspelledWords(args[0]));
					break;

				case 'favicon-changed':
					dispatch({ type: WEBVIEW_FAVICON_CHANGED, payload: { webContentsId: webContents.id, url, favicon: args[0] } });
					break;
			}
		};

		const webview = webviewRef.current;

		webview.addEventListener('ipc-message', handleIpcMessage);

		return () => {
			webview.removeEventListener('ipc-message', handleIpcMessage);
		};
	}, [webviewRef, webContents, url, dispatch, getMisspelledWords]);

	useEffect(() => {
		if (!webContents || process.platform !== 'darwin') {
			return;
		}

		webContents.send('sidebar-visibility-changed', hasSidebar);
	}, [webContents, hasSidebar]);

	const visible = active && !failed;

	useSaga(function *() {
		if (!webContents || !visible) {
			return;
		}

		yield takeEvery(TOUCH_BAR_FORMAT_BUTTON_TOUCHED, function *({ payload: buttonId }) {
			webContents.send('format-button-touched', buttonId);
		});

		yield takeEvery(SCREEN_SHARING_DIALOG_SOURCE_SELECTED, function *({ payload: sourceId }) {
			webContents.send('screen-sharing-source-selected', sourceId);
		});
	}, [webContents, visible]);
};
